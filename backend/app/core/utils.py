import re

def normalize_phone(phone: str) -> str:
    """
    Strips all non-digit characters from the phone number.
    Optionally prefixes with +1 if it is a 10 digit US number without it.
    This ensures +19045872021, 9045872021, and (904) 587-2021 all resolve to +19045872021.
    """
    if not phone:
        return phone
        
    digits = re.sub(r'\D', '', phone)
    
    if len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 11 and digits.startswith('1'):
        return f"+{digits}"
    
    # Fallback for international or incomplete numbers
    return f"+{digits}" if digits else phone
