"""Offline regression tests: real routes/rules/merger, fake DB and model pipeline.
Run: python -m unittest discover -s tests -v (from backend).
"""
import asyncio
import copy
import json
import sys
import types
import unittest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

# Isolate infrastructure: no API keys, network, or production database are used.
database = types.ModuleType('app.core.database')
database.get_mongo_db = AsyncMock()
database.save_story_memory = AsyncMock()
sys.modules['app.core.database'] = database
workflow = types.ModuleType('app.graph.workflow')
workflow.story_pipeline = types.SimpleNamespace(ainvoke=AsyncMock(), astream_events=None)
sys.modules['app.graph.workflow'] = workflow
embedding = types.ModuleType('app.services.embedding')
embedding.get_text_embedding = AsyncMock(return_value=[0.0])
sys.modules['app.services.embedding'] = embedding

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.testclient import TestClient
from app.models.schemas import StoryConfig, CharacterState, PlayerActionRequest, MapLocation
from app.core.turn_rules import prepare_action, initial_turn_state
from app.core.state_merger import apply_state_changes, _safe_float, _safe_int
from app.core.story_access import story_mutation, require_story_access
from app.core.security import get_current_user
from app.api import stream_story, story as story_api


def make_story():
    return StoryConfig(story_id='test', user_id='owner', character=CharacterState(name='An'), current_chapter=1,
        locations=[MapLocation(location_id='a',name='A',description='Start',is_current=True,connected_to=['b']),
                   MapLocation(location_id='b',name='B',description='Road'), MapLocation(location_id='c',name='C',description='Locked',is_unlocked=False)]).model_dump()


class FakeStories:
    def __init__(self, doc): self.doc = copy.deepcopy(doc)
    async def find_one(self, query, *args):
        if not self.doc or any(self.doc.get(k) != v for k,v in query.items() if not k.startswith('$')): return None
        return copy.deepcopy(self.doc)
    async def update_one(self, query, changes):
        match = self.doc and all(self.doc.get(k) == v for k,v in query.items() if not k.startswith('$'))
        if '$or' in query: match = match and self.doc.get('mutation_until', datetime.min) <= datetime.utcnow()
        if not match: return types.SimpleNamespace(matched_count=0)
        self.doc.update(copy.deepcopy(changes.get('$set', {})))
        for key in changes.get('$unset', {}): self.doc.pop(key,None)
        return types.SimpleNamespace(matched_count=1)


class RuleTests(unittest.TestCase):
    def setUp(self):
        self.story = make_story()
        self.previous = {'choices':[{'choice_id':1,'title':'Mở cánh cửa','description':'Dùng chìa khóa bạc','risk_level':'risky'}]}
    def test_choice_contains_actual_text_and_server_dice(self):
        with patch('app.core.turn_rules.secrets.randbelow', return_value=2):
            action, context, record = prepare_action(PlayerActionRequest(story_id='test',choice_id=1,dice_result=20,approach='careful'),self.story,self.previous)
        self.assertIn('Mở cánh cửa',context); self.assertIn('Dùng chìa khóa bạc',context)
        self.assertEqual(action.dice_result,3); self.assertEqual(record['dice_result'],3)
        self.assertIn('not a stat bonus',context)
    def test_forged_choice_rejected(self):
        with self.assertRaises(HTTPException): prepare_action(PlayerActionRequest(story_id='test',choice_id=3),self.story,self.previous)
    def test_stale_chapter_rejected(self):
        with self.assertRaises(HTTPException) as error: prepare_action(PlayerActionRequest(story_id='test',choice_id=1,expected_chapter=0),self.story,self.previous)
        self.assertEqual(error.exception.status_code,409)
    def test_ended_and_dead_rejected(self):
        for key in ['is_ended','hp']:
            data=copy.deepcopy(self.story)
            if key=='hp': data['character']['hp']=0
            else: data[key]=True
            with self.assertRaises(HTTPException): prepare_action(PlayerActionRequest(story_id='test',choice_id=1),data,self.previous)
    def test_locked_and_disconnected_move_rejected(self):
        for target in ['c','missing','a']:
            with self.assertRaises(HTTPException): prepare_action(PlayerActionRequest(story_id='test',action_type='move',target_location_id=target),self.story,self.previous)
        self.story['locations'][2]['is_unlocked']=True
        with self.assertRaises(HTTPException): prepare_action(PlayerActionRequest(story_id='test',action_type='move',target_location_id='c'),self.story,self.previous)
    def test_valid_move(self):
        _,context,record=prepare_action(PlayerActionRequest(story_id='test',action_type='move',target_location_id='b'),self.story,self.previous)
        self.assertIn('B',context); self.assertEqual(record['action_type'],'move')
    def test_empty_custom_and_unknown_action_rejected(self):
        for action in ['custom','invent_gold']:
            with self.assertRaises(HTTPException): prepare_action(PlayerActionRequest(story_id='test',action_type=action,custom_action='  '),self.story,self.previous)
    def test_custom_cannot_inject_dice(self):
        action,_,record=prepare_action(PlayerActionRequest(story_id='test',action_type='custom',custom_action='Quan sát',dice_result=20),self.story,self.previous)
        self.assertIsNone(action.dice_result); self.assertIsNone(record['dice_result'])
    def test_initial_state_has_memory_and_chapter_inputs(self):
        action=PlayerActionRequest(story_id='test',choice_id=1)
        state=initial_turn_state(self.story,action,'test')
        self.assertEqual(state['player_action']['story_id'],'test'); self.assertEqual(state['chapter_number'],2)
    def test_nonfinite_values_are_safe(self):
        for value in [float('nan'),float('inf'),'bad',None]: self.assertEqual(_safe_float(value),0)
        self.assertEqual(_safe_int(float('inf')),0)


class AsyncTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.stories=FakeStories(make_story())
        self.db=types.SimpleNamespace(stories=self.stories,chapters=types.SimpleNamespace(find_one=AsyncMock(return_value={'choices':[{'choice_id':1,'title':'Open','risk_level':'normal'}]}),replace_one=AsyncMock(),update_one=AsyncMock()))
        database.get_mongo_db.return_value=self.db
    async def test_health_energy_clamped_and_death_persisted(self):
        result=await apply_state_changes('test',{'hp_change':-150,'energy_change':-20},2)
        self.assertEqual(result['config'].character.hp,0)
        self.assertEqual(result['config'].character.energy,80)
        self.assertTrue(result['config'].is_ended)
        self.assertEqual(result['config'].total_turns,1)
    async def test_empty_diff_still_advances_turn(self):
        await apply_state_changes('test',{},2)
        self.assertEqual(self.stories.doc['current_chapter'],2); self.assertEqual(self.stories.doc['total_turns'],1)
    async def test_mutation_excludes_concurrent_writers_and_releases_on_failure(self):
        with self.assertRaises(RuntimeError):
            async with story_mutation('test'):
                with self.assertRaises(HTTPException) as error:
                    async with story_mutation('test'): pass
                self.assertEqual(error.exception.status_code,409)
                raise RuntimeError('simulated failure')
        self.assertNotIn('mutation_token',self.stories.doc)
        async with story_mutation('test'): pass
    async def test_expired_lease_can_recover(self):
        self.stories.doc['mutation_until']=datetime.utcnow()-timedelta(seconds=1)
        async with story_mutation('test'): self.assertIn('mutation_token',self.stories.doc)
    async def test_stream_filters_internal_tokens_and_replaces_revision(self):
        async def events(*args,**kwargs):
            yield {'event':'on_chat_model_stream','name':'director','data':{'chunk':types.SimpleNamespace(content='PRIVATE_PLAN')}}
            yield {'event':'on_chain_end','name':'writer','data':{'output':{'chapter_content':'Bản nháp'}}}
            yield {'event':'on_chain_end','name':'writer','data':{'output':{'chapter_content':'Bản chỉnh sửa'}}}
            yield {'event':'on_chain_end','name':'LangGraph','data':{'output':{'chapter_content':'Bản chỉnh sửa','chapter_title':'Mở cửa','choices':[],'state_changes':{}}}}
        with patch.object(stream_story.story_pipeline,'astream_events',events):
            response=await stream_story.stream_story_turn(PlayerActionRequest(story_id='test',choice_id=1),BackgroundTasks())
            chunks=[chunk async for chunk in response.body_iterator]
        text=''.join(chunks)
        self.assertNotIn('PRIVATE_PLAN',text); self.assertEqual(text.count('"type": "replace"'),2)
        self.assertEqual(text.count('"type": "done"'),1); self.assertNotIn('mutation_token',self.stories.doc)
        self.assertEqual(self.stories.doc['current_chapter'],2)
    async def test_invalid_arrival_preserves_current_location(self):
        for location in ['unknown', 'c']:
            result=await apply_state_changes('test', {'current_location_id':location}, 2)
            self.assertEqual([x.location_id for x in result['config'].locations if x.is_current], ['a'])
    async def test_discovered_location_can_be_arrival(self):
        result=await apply_state_changes('test', {'new_locations':[{'location_id':'new','name':'New','description':'A new street','is_unlocked':True}], 'current_location_id':'new'}, 2)
        self.assertEqual([x.location_id for x in result['config'].locations if x.is_current], ['new'])
    async def test_writer_failure_does_not_save_a_turn(self):
        from app.core.turn_service import persist_turn
        with self.assertRaises(HTTPException):
            await persist_turn(PlayerActionRequest(story_id='test',choice_id=1),self.stories.doc,{'chapter_content':'','error':'writer_failed'}, {})
        self.db.chapters.replace_one.assert_not_awaited()
        self.assertEqual(self.stories.doc['current_chapter'],1)
    async def test_game_over_clears_choices(self):
        from app.core.turn_service import persist_turn
        chapter,config=await persist_turn(PlayerActionRequest(story_id='test',choice_id=1),self.stories.doc,
            {'chapter_content':'The end','state_changes':{'hp_change':-100},'choices':[{'choice_id':1,'title':'Continue','description':'bad continuation'}]}, {})
        self.assertTrue(config.is_ended);self.assertEqual(chapter.choices,[])

    async def test_stream_failure_releases_lock(self):
        async def events(*args,**kwargs):
            raise RuntimeError('private provider detail')
            yield
        with patch.object(stream_story.story_pipeline,'astream_events',events):
            response=await stream_story.stream_story_turn(PlayerActionRequest(story_id='test',choice_id=1),BackgroundTasks())
            text=''.join([chunk async for chunk in response.body_iterator])
        self.assertIn('"type": "error"',text); self.assertNotIn('private provider detail',text)
        self.assertNotIn('mutation_token',self.stories.doc)


class OwnershipTests(unittest.TestCase):
    def setUp(self):
        self.app=FastAPI(); self.app.include_router(story_api.router); self.app.include_router(stream_story.router,prefix='/api/story')
        database.get_mongo_db.return_value=types.SimpleNamespace(stories=FakeStories(make_story()))
        self.client=TestClient(self.app)
    def test_anonymous_read_and_stream_blocked(self):
        self.assertEqual(self.client.get('/api/story/state/test').status_code,401)
        self.assertEqual(self.client.post('/api/story/stream-turn',json={'story_id':'test','choice_id':1}).status_code,401)
    def test_other_owner_read_and_write_blocked(self):
        self.app.dependency_overrides[get_current_user]=lambda:{'user_id':'intruder','role':'user'}
        self.assertEqual(self.client.get('/api/story/state/test').status_code,404)
        self.assertEqual(self.client.post('/api/story/turn',json={'story_id':'test','choice_id':1}).status_code,404)
    def test_owner_cannot_enable_god_mode(self):
        self.app.dependency_overrides[get_current_user]=lambda:{'user_id':'owner','role':'user'}
        self.assertEqual(self.client.patch('/api/story/god-mode/test').status_code,403)

if __name__=='__main__': unittest.main()
