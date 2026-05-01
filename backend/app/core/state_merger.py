"""
Robust State Merger: Safely applies AI-generated state_changes to the StoryConfig in MongoDB.
Handles: Psychology, Economy (Currencies + Inventory), Relationships, Factions, Quests, Plot Triggers.
All operations are wrapped in try/except to prevent a single bad field from crashing the entire turn.
"""

from datetime import datetime
from app.core.database import get_mongo_db
from app.models.schemas import StoryConfig, InventoryItem
import traceback


async def apply_state_changes(story_id: str, state_changes: dict, chapter_number: int) -> dict:
    """
    Reads the current StoryConfig from DB, merges state_changes, saves back.
    Returns a summary dict of what was actually changed for logging/debugging.
    """
    db = await get_mongo_db()
    story_doc = await db.stories.find_one({"story_id": story_id})
    if not story_doc:
        return {"error": "Story not found"}

    config = StoryConfig(**story_doc)
    merge_log = []

    # ─── 1. PSYCHOLOGY ───────────────────────────────────────────
    try:
        psych = state_changes.get("psychology", {})
        if psych:
            stress_delta = _safe_float(psych.get("stress_change", 0))
            config.character.psychology.stress_level = max(0.0, min(100.0,
                config.character.psychology.stress_level + stress_delta
            ))
            if psych.get("mood"):
                config.character.psychology.mood = str(psych["mood"])
            if psych.get("current_thoughts"):
                config.character.psychology.current_thoughts = str(psych["current_thoughts"])
            merge_log.append(f"Psychology: stress {stress_delta:+.0f}, mood={config.character.psychology.mood}")
    except Exception as e:
        merge_log.append(f"[SKIP] Psychology merge failed: {e}")

    # ─── 1.5. CUSTOM TRAITS ──────────────────────────────────────
    try:
        trait_changes = state_changes.get("trait_changes", [])
        for tc in trait_changes:
            trait_name = str(tc.get("trait_name", ""))
            delta = _safe_float(tc.get("change_amount", 0))
            if not trait_name or delta == 0:
                continue
            
            existing = next((t for t in config.character.traits if t.name.lower() == trait_name.lower()), None)
            if existing:
                existing.current_value = max(existing.min_value, min(existing.max_value, existing.current_value + delta))
                merge_log.append(f"Trait: {existing.name} {delta:+.1f} -> {existing.current_value}")
            else:
                # If AI invents a new trait (rare but possible), we could add it, but safer to ignore
                merge_log.append(f"[SKIP] Trait '{trait_name}' not found in CharacterState")
    except Exception as e:
        merge_log.append(f"[SKIP] Traits merge failed: {e}")

    # ─── 2. ECONOMY: CURRENCIES ──────────────────────────────────
    try:
        econ = state_changes.get("economy", {})
        currency_changes = econ.get("currency_changes", {})
        for currency_name, delta in currency_changes.items():
            delta = _safe_float(delta)
            if delta == 0:
                continue
            current = config.character.economy.currencies.get(currency_name, 0.0)
            config.character.economy.currencies[currency_name] = max(0.0, current + delta)
            merge_log.append(f"Currency: {currency_name} {delta:+.1f}")
    except Exception as e:
        merge_log.append(f"[SKIP] Currency merge failed: {e}")

    # ─── 3. ECONOMY: INVENTORY ───────────────────────────────────
    try:
        inv_changes = econ.get("inventory_changes", [])
        for change in inv_changes:
            item_id = str(change.get("item_id", ""))
            name = str(change.get("name", item_id))
            qty_delta = _safe_int(change.get("quantity_change", 0))
            if qty_delta == 0 or not item_id:
                continue

            # Find existing item in inventory
            existing = next((it for it in config.character.economy.inventory if it.item_id == item_id), None)
            if existing:
                existing.quantity = max(0, existing.quantity + qty_delta)
                if existing.quantity == 0:
                    config.character.economy.inventory.remove(existing)
                    merge_log.append(f"Inventory: removed {name}")
                else:
                    merge_log.append(f"Inventory: {name} qty {qty_delta:+d}")
            elif qty_delta > 0:
                config.character.economy.inventory.append(
                    InventoryItem(item_id=item_id, name=name, quantity=qty_delta)
                )
                merge_log.append(f"Inventory: added {name} x{qty_delta}")
    except Exception as e:
        merge_log.append(f"[SKIP] Inventory merge failed: {e}")

    # ─── 4. RELATIONSHIPS ────────────────────────────────────────
    try:
        rel_changes = state_changes.get("relationships", [])
        for rc in rel_changes:
            npc_name = str(rc.get("npc_name", ""))
            if not npc_name:
                continue
            existing = next((r for r in config.character.relationships if r.npc_name == npc_name), None)
            if existing:
                existing.trust = max(0, min(100, existing.trust + _safe_float(rc.get("trust_change", 0))))
                existing.affection = max(0, min(100, existing.affection + _safe_float(rc.get("affection_change", 0))))
                existing.hostility = max(0, min(100, existing.hostility + _safe_float(rc.get("hostility_change", 0))))
                existing.last_interaction_chapter = chapter_number
                merge_log.append(f"Relationship: {npc_name} trust={existing.trust:.0f}")
            else:
                from app.models.schemas import NPCRelationship
                config.character.relationships.append(NPCRelationship(
                    npc_name=npc_name,
                    npc_title=str(rc.get("npc_title", "")),
                    trust=50 + _safe_float(rc.get("trust_change", 0)),
                    affection=50 + _safe_float(rc.get("affection_change", 0)),
                    hostility=_safe_float(rc.get("hostility_change", 0)),
                    last_interaction_chapter=chapter_number
                ))
                merge_log.append(f"Relationship: NEW NPC {npc_name}")
    except Exception as e:
        merge_log.append(f"[SKIP] Relationships merge failed: {e}")

    # ─── 5. FACTIONS ─────────────────────────────────────────────
    try:
        fac_changes = state_changes.get("factions", [])
        for fc in fac_changes:
            org_id = str(fc.get("org_id", ""))
            if not org_id:
                continue
            existing = next((f for f in config.character.factions if f.org_id == org_id), None)
            if existing:
                existing.reputation = max(-100, min(100,
                    existing.reputation + _safe_int(fc.get("reputation_change", 0))
                ))
                new_status = fc.get("new_status", "")
                if new_status:
                    existing.status = new_status
                merge_log.append(f"Faction: {existing.org_name} rep={existing.reputation}")
            else:
                from app.models.schemas import FactionRelation
                config.character.factions.append(FactionRelation(
                    org_id=org_id,
                    org_name=str(fc.get("org_name", org_id)),
                    reputation=_safe_int(fc.get("reputation_change", 0)),
                    status=fc.get("new_status", "known"),
                ))
                merge_log.append(f"Faction: NEW faction {org_id}")
    except Exception as e:
        merge_log.append(f"[SKIP] Factions merge failed: {e}")

    # ─── 6. LOCATIONS (MOVEMENT) ─────────────────────────────────
    try:
        new_loc_id = state_changes.get("current_location_id", "")
        if new_loc_id:
            found = False
            for loc in config.locations:
                if loc.location_id == new_loc_id:
                    loc.is_current = True
                    found = True
                else:
                    loc.is_current = False
            if found:
                merge_log.append(f"Location: Moved to {new_loc_id}")
            else:
                merge_log.append(f"Location: {new_loc_id} not found in map")
    except Exception as e:
        merge_log.append(f"[SKIP] Location merge failed: {e}")

    # ─── 7. PLOT TRIGGERS ────────────────────────────────────────
    try:
        triggered = state_changes.get("triggered_events", [])
        for trigger_title in triggered:
            for pt in config.plot_triggers:
                if pt.title.lower() == str(trigger_title).lower() and not pt.triggered:
                    pt.triggered = True
                    pt.triggered_at_chapter = chapter_number
                    merge_log.append(f"PlotTrigger: '{pt.title}' ACTIVATED at chapter {chapter_number}")
    except Exception as e:
        merge_log.append(f"[SKIP] PlotTrigger merge failed: {e}")

    # ─── 8. DYNAMIC WORLD: NEW LOCATIONS ─────────────────────────
    try:
        new_locs = state_changes.get("new_locations", [])
        from app.models.schemas import MapLocation
        for loc_data in new_locs:
            if not isinstance(loc_data, dict):
                continue
            loc_id = str(loc_data.get("location_id", ""))
            if not loc_id:
                continue
            # Skip if already exists
            if any(l.location_id == loc_id for l in config.locations):
                continue
            try:
                new_loc = MapLocation(**loc_data)
                config.locations.append(new_loc)
                merge_log.append(f"World: NEW location '{new_loc.name}'")
            except Exception as e:
                merge_log.append(f"[SKIP] Invalid new location {loc_id}: {e}")
    except Exception as e:
        merge_log.append(f"[SKIP] New locations merge failed: {e}")

    # ─── 9. DYNAMIC WORLD: NEW SHOP ITEMS ────────────────────────
    try:
        new_items = state_changes.get("new_shop_items", [])
        from app.models.schemas import ShopItem
        for item_data in new_items:
            if not isinstance(item_data, dict):
                continue
            item_id = str(item_data.get("item_id", ""))
            if not item_id:
                continue
            if any(i.item_id == item_id for i in config.available_shop_items):
                continue
            try:
                new_item = ShopItem(**item_data)
                config.available_shop_items.append(new_item)
                merge_log.append(f"World: NEW shop item '{new_item.name}'")
            except Exception as e:
                merge_log.append(f"[SKIP] Invalid new shop item {item_id}: {e}")
    except Exception as e:
        merge_log.append(f"[SKIP] New shop items merge failed: {e}")

    # ─── 10. DYNAMIC WORLD: NEW ORGANIZATIONS ───────────────────
    try:
        new_orgs = state_changes.get("new_organizations", [])
        from app.models.schemas import Organization
        for org_data in new_orgs:
            if not isinstance(org_data, dict):
                continue
            org_id = str(org_data.get("org_id", ""))
            if not org_id:
                continue
            if any(o.org_id == org_id for o in config.available_organizations):
                continue
            try:
                new_org = Organization(**org_data)
                config.available_organizations.append(new_org)
                merge_log.append(f"World: NEW organization '{new_org.name}'")
            except Exception as e:
                merge_log.append(f"[SKIP] Invalid new org {org_id}: {e}")
    except Exception as e:
        merge_log.append(f"[SKIP] New organizations merge failed: {e}")

    # ─── 7. UPDATE DB ────────────────────────────────────────────
    config.current_chapter = chapter_number
    config.total_turns += 1
    config.updated_at = datetime.utcnow()

    await db.stories.update_one(
        {"story_id": story_id},
        {"$set": config.model_dump()}
    )

    print(f"[STATE MERGER] Applied {len(merge_log)} changes:")
    for log in merge_log:
        print(f"  -> {log}")

    return {"applied": merge_log, "config": config}


# ─── HELPER: Safe Type Conversion ─────────────────────────────
def _safe_float(val) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0

def _safe_int(val) -> int:
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 0
