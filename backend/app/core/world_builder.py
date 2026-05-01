"""
World Builder: Generates initial world data and character profile in a SINGLE LLM call
to ensure consistency, save time, and avoid hardcoded generic templates.
"""

from app.models.schemas import MapLocation, Organization, ShopItem, CustomTrait, SpecialAbility, AbilitySideEffect, PlotTrigger
from app.core.llm_factory import get_llm
from app.core.config import get_settings
import json
import re
import uuid

async def generate_world_and_character(genre: str, world_description: str, character_name: str, backstory: str) -> dict:
    """
    Calls the LLM to generate the complete starting state:
    Locations, Factions, Shop Items, Traits, Abilities, Skills, and Plot Triggers.
    Returns a unified dictionary.
    """
    settings = get_settings()
    # Use editor_model (lighter/faster) — world gen doesn't need the heavy director model
    llm = get_llm(settings.editor_model, temperature=0.7, max_tokens=3000)
    
    prompt = f"""
    Bạn là một Game Master lão luyện thiết kế game RPG. Người chơi đang tạo một nhân vật mới.
    
    # BỐI CẢNH
    Thể loại: {genre}
    Mô tả thế giới: {world_description}
    Tên nhân vật: {character_name}
    Tiểu sử: {backstory}
    
    # YÊU CẦU QUAN TRỌNG
    1. BẮT BUỘC trả lời bằng TIẾNG VIỆT 100%.
    2. Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ, không bọc trong markdown ```json.
    3. Phân biệt rõ RÀNG:
       - "abilities" (Thiên phú): Khả năng TỰ NHIÊN, BẨM SINH (VD: Thể lực siêu phàm, Trực giác, Máu rồng).
       - "skills" (Kỹ năng): Khả năng HỌC ĐƯỢC qua rèn luyện (VD: Bắn súng, Lập trình, Đột nhập, Nấu ăn).
    4. Địa điểm, Thế lực, và Vật phẩm cửa hàng phải ĐỘC ĐÁO, bám sát tiểu sử và thế giới. Không dùng các từ chung chung như "Khu vực phía Bắc".
    
    # CẤU TRÚC JSON YÊU CẦU
    {{
        "locations": [
            {{"location_id": "loc_1", "name": "Tên địa điểm 1", "description": "Mô tả chi tiết", "function": "Chức năng (VD: Nghỉ ngơi)", "benefits": "Lợi ích", "risks": "Rủi ro", "is_current": true, "x_position": 50, "y_position": 50, "connected_to": ["loc_2"]}}
            // Tạo 4-5 địa điểm, nối với nhau hợp lý
        ],
        "organizations": [
            {{"org_id": "org_1", "name": "Tên thế lực", "type": "corporate/gang/cult/etc", "public_description": "Mô tả", "danger_level": 5, "benefits_description": "Lợi ích khi gia nhập", "join_requirements": {{"Tiền": 100}}}}
            // Tạo 2-3 thế lực
        ],
        "shop_items": [
            {{"item_id": "item_1", "name": "Tên vật phẩm", "category": "Vũ khí/Thuốc/Công cụ", "price": 50, "currency_type": "Gold/Credits/etc", "description": "Mô tả", "narrative_impact": "Tác dụng trong truyện", "is_consumable": false}}
            // Tạo 4-5 vật phẩm phù hợp bối cảnh
        ],
        "traits": [
            {{"name": "Tên chỉ số", "description": "Mô tả", "current_value": 50, "max_value": 100, "min_value": 0, "story_impact": "Ảnh hưởng cốt truyện"}}
            // Tạo 3-4 chỉ số (VD: Lý trí, Phóng xạ, Thể lực)
        ],
        "abilities": [
            {{"name": "Thiên phú 1", "description": "Mô tả", "origin": "Bẩm sinh/Đột biến", "power_level": 1, "side_effects": [{{"description": "Tác dụng phụ", "trait_affected": "Tên chỉ số (nếu có)", "impact_amount": -10, "narrative_consequence": "Hậu quả"}}], "cooldown_turns": 3}}
            // Tạo 1-2 thiên phú BẨM SINH
        ],
        "skills": [
            {{"name": "Kỹ năng 1", "description": "Mô tả", "proficiency": 5, "source": "Học từ đâu"}}
            // Tạo 2-3 kỹ năng HỌC ĐƯỢC
        ],
        "plot_triggers": [
            {{"title": "Sự kiện 1", "description": "Chuyện gì xảy ra", "importance": 8, "probability": 0.5, "earliest_chapter": 2}}
            // Tạo 2 sự kiện dựa theo tiểu sử
        ],
        "initial_npcs": [
            {{"npc_name": "Tên NPC", "npc_title": "Vai trò (VD: Bác sĩ, Kẻ đượng phố)", "trust": 50, "affection": 50, "hostility": 0}}
            // Tạo 2-4 NPC ban đầu mà nhân vật có mối quan hệ (bạn bè, đối thủ, người thân, người quen)
        ]
    }}
    """
    
    try:
        response = await llm.ainvoke(prompt)
        content = response.content if hasattr(response, 'content') else str(response)
        
        # Parse JSON
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            data = json.loads(match.group(0))
            # Ensure all array fields exist to prevent frontend crash
            for key in ["locations", "organizations", "shop_items", "traits", "abilities", "skills", "plot_triggers", "initial_npcs"]:
                if key not in data or data[key] is None:
                    data[key] = []
            return data
        else:
            raise ValueError("No JSON found in LLM output")
            
    except Exception as e:
        print(f"[ERROR] Auto-generating world and profile failed: {e}")
        return _fallback_world()


def _fallback_world() -> dict:
    """Trả về dữ liệu cơ bản nếu LLM fail, giúp server không bị crash."""
    return {
        "locations": [
            MapLocation(location_id="start", name="Điểm Khởi Đầu", description="Nơi câu chuyện của bạn bắt đầu.", function="Nghỉ ngơi", benefits="An toàn", risks="Không có", is_current=True, x_position=50, y_position=50, connected_to=[]).model_dump()
        ],
        "organizations": [],
        "shop_items": [
            ShopItem(item_id="basic_tool", name="Dụng cụ sinh tồn", category="Công cụ", price=10, currency_type="Tiền", description="Hữu ích trong nhiều tình huống.", narrative_impact="Giúp vượt qua chướng ngại vật.").model_dump()
        ],
        "traits": [
            CustomTrait(name="Thể Lực", description="Sức khỏe thể chất", current_value=100, max_value=100, story_impact="Ảnh hưởng khả năng sống sót.").model_dump()
        ],
        "abilities": [],
        "skills": [],
        "plot_triggers": []
    }
