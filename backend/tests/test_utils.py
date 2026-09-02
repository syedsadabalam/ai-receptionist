from app.core.utils import normalize_phone

def test_normalize_phone():
    assert normalize_phone("+19045872021") == "+19045872021"
    assert normalize_phone("9045872021") == "+19045872021"
    assert normalize_phone("(904) 587-2021") == "+19045872021"
    assert normalize_phone("904-587-2021") == "+19045872021"
    
    # 11 digits starting with 1
    assert normalize_phone("19045872021") == "+19045872021"
    
    # Empty cases
    assert normalize_phone("") == ""
    assert normalize_phone(None) == None
