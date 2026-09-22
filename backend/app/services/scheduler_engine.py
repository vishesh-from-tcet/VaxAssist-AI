"""
Deterministic Vaccination Scheduling Engine for VaxAssist AI.

STRICT MEDICAL DETERMINISM REQUIREMENT:
- Pure algorithmic evaluation based on versioned schedule guidelines.
- NO Large Language Model (LLM) calculation, hallucination, or invention.
"""

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from app.services.schedule_catalog import (
    get_schedule_catalog,
    SCHEDULE_VERSION,
    EFFECTIVE_DATE,
    DEFAULT_SOURCE,
)


def _normalize_str(text: Optional[str]) -> str:
    if not text:
        return ""
    return text.lower().strip()


def _matches_vaccine_and_dose(rule: Dict[str, Any], record: Dict[str, Any]) -> bool:
    """Deterministic match between a guideline rule and an administered record."""
    r_vax = _normalize_str(rule.get("vaccine", ""))
    rec_vax = _normalize_str(record.get("vaccine_name", ""))
    
    # Check vaccine name substring or alias match
    vaccine_match = False
    if "bcg" in r_vax and "bcg" in rec_vax:
        vaccine_match = True
    elif "hepb" in r_vax or "hepatitis b" in r_vax:
        if "hep" in rec_vax and "b" in rec_vax:
            vaccine_match = True
    elif "polio" in r_vax or "opv" in r_vax or "ipv" in r_vax:
        if "polio" in rec_vax or "opv" in rec_vax or "ipv" in rec_vax:
            vaccine_match = True
    elif "dtp" in r_vax or "tdap" in r_vax or "pentavalent" in r_vax:
        if any(term in rec_vax for term in ["dtp", "dtap", "tdap", "pentavalent", "diphtheria", "tetanus"]):
            vaccine_match = True
    elif "rota" in r_vax and "rota" in rec_vax:
        vaccine_match = True
    elif "mmr" in r_vax or "measles" in r_vax:
        if "mmr" in rec_vax or "measles" in rec_vax or "mr" in rec_vax:
            vaccine_match = True
    elif "flu" in r_vax or "influenza" in r_vax:
        if "flu" in rec_vax or "influenza" in rec_vax:
            vaccine_match = True
    elif "covid" in r_vax and "covid" in rec_vax:
        vaccine_match = True
    elif r_vax in rec_vax or rec_vax in r_vax:
        vaccine_match = True

    if not vaccine_match:
        return False

    # Check dose match
    r_dose = _normalize_str(rule.get("dose", ""))
    rec_dose = _normalize_str(record.get("dose", ""))

    if "birth" in r_dose:
        return "birth" in rec_dose or "0" in rec_dose or "dose 1" in rec_dose
    elif "dose 1" in r_dose or "1st" in r_dose:
        return "1" in rec_dose and "10" not in rec_dose and "16" not in rec_dose
    elif "dose 2" in r_dose or "2nd" in r_dose:
        return "2" in rec_dose and "20" not in rec_dose
    elif "dose 3" in r_dose or "3rd" in r_dose:
        return "3" in rec_dose
    elif "booster 1" in r_dose:
        return "booster 1" in rec_dose or ("booster" in rec_dose and "2" not in rec_dose)
    elif "booster 2" in r_dose:
        return "booster 2" in rec_dose
    elif "annual" in r_dose:
        return "annual" in rec_dose or "yearly" in rec_dose or "shot" in rec_dose or "single" in rec_dose
    elif "booster" in r_dose:
        return "booster" in rec_dose or "td" in rec_dose

    return True


def evaluate_member_schedule(
    member_dob: str,
    member_profile: Dict[str, Any],
    vaccination_records: List[Dict[str, Any]],
    country: str = "IN",
    region: str = "National",
    schedule_version: str = SCHEDULE_VERSION,
    reference_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Evaluates vaccination schedule deterministically.

    Categorizes items into:
    - completed: Doses verified and administered according to guideline.
    - upcoming: Future doses with calculated due date and age milestone.
    - overdue: Past-due doses where grace period has elapsed.
    - unknown_unverified: Self-reported, pending, or unmapped doses.
    """
    if reference_date is None:
        reference_date = date.today()

    try:
        dob_date = date.fromisoformat(member_dob.strip())
    except (ValueError, AttributeError):
        dob_date = reference_date

    member_age_days = (reference_date - dob_date).days
    years_approx = round(member_age_days / 365.25, 1)

    catalog_rules = get_schedule_catalog(country=country, region=region, version=schedule_version)

    completed_items = []
    upcoming_items = []
    overdue_items = []
    unverified_items = []

    matched_record_ids = set()

    for rule in catalog_rules:
        rule_id = rule["rule_id"]
        rec_age_days = rule["recommended_age_days"]
        grace_days = rule.get("overdue_grace_days", 30)

        due_date = dob_date + timedelta(days=rec_age_days)
        overdue_date = due_date + timedelta(days=grace_days)

        # Look for matching administered record
        matching_record = None
        for rec in vaccination_records:
            if rec.get("id") in matched_record_ids:
                continue
            if _matches_vaccine_and_dose(rule, rec):
                matching_record = rec
                break

        if matching_record:
            matched_record_ids.add(matching_record.get("id"))
            v_status = matching_record.get("verification_status", "verified")
            admin_date_str = matching_record.get("administration_date", "")

            item_data = {
                "rule_id": rule_id,
                "vaccine_name": rule["vaccine_display_name"],
                "dose": rule["dose"],
                "recommended_age": rule["recommended_age_label"],
                "due_date": due_date.isoformat(),
                "administered_date": admin_date_str,
                "record_id": matching_record.get("id"),
                "clinic": matching_record.get("clinic"),
                "provider": matching_record.get("provider"),
                "batch_number": matching_record.get("batch_number"),
                "verification_status": v_status,
                "source": rule["source"],
                "schedule_version": rule["schedule_version"],
                "effective_date": rule["effective_date"],
                "status": "completed" if v_status == "verified" else "unverified",
                "explanation": (
                    f"Administered on {admin_date_str}. Verified against deterministic rule {rule_id} "
                    f"({rule['recommended_age_label']})."
                    if v_status == "verified"
                    else f"Self-reported dose logged on {admin_date_str}. Pending official certification."
                ),
            }

            if v_status == "verified":
                completed_items.append(item_data)
            else:
                unverified_items.append(item_data)

        else:
            # Not completed yet
            if reference_date > overdue_date:
                # Overdue
                overdue_days = (reference_date - overdue_date).days
                overdue_items.append({
                    "rule_id": rule_id,
                    "vaccine_name": rule["vaccine_display_name"],
                    "dose": rule["dose"],
                    "recommended_age": rule["recommended_age_label"],
                    "due_date": due_date.isoformat(),
                    "overdue_since": overdue_date.isoformat(),
                    "overdue_days": max(1, overdue_days),
                    "status": "overdue",
                    "source": rule["source"],
                    "schedule_version": rule["schedule_version"],
                    "effective_date": rule["effective_date"],
                    "explanation": (
                        f"Overdue by {max(1, overdue_days)} days. Recommended at {rule['recommended_age_label']} "
                        f"(Target Due Date: {due_date.isoformat()}, Grace Period: {grace_days} days). "
                        f"Deterministic rule: {rule_id}."
                    ),
                })
            else:
                # Upcoming / Due Soon
                days_until = (due_date - reference_date).days
                is_due_now = days_until <= 0  # In recommended grace window
                upcoming_items.append({
                    "rule_id": rule_id,
                    "vaccine_name": rule["vaccine_display_name"],
                    "dose": rule["dose"],
                    "recommended_age": rule["recommended_age_label"],
                    "due_date": due_date.isoformat(),
                    "days_until_due": days_until,
                    "is_due_now": is_due_now,
                    "status": "due_now" if is_due_now else "upcoming",
                    "source": rule["source"],
                    "schedule_version": rule["schedule_version"],
                    "effective_date": rule["effective_date"],
                    "explanation": (
                        f"Currently due (within grace period until {overdue_date.isoformat()}). "
                        f"Recommended at {rule['recommended_age_label']}."
                        if is_due_now
                        else f"Upcoming in {days_until} days on {due_date.isoformat()}. "
                             f"Recommended milestone: {rule['recommended_age_label']}."
                    ),
                })

    # Catch unmatched records
    for rec in vaccination_records:
        if rec.get("id") not in matched_record_ids:
            unverified_items.append({
                "rule_id": "CUSTOM-RECORD",
                "vaccine_name": rec.get("vaccine_name", "Unknown Vaccine"),
                "dose": rec.get("dose", "Dose"),
                "recommended_age": "Custom / Unmapped",
                "administered_date": rec.get("administration_date"),
                "record_id": rec.get("id"),
                "clinic": rec.get("clinic"),
                "verification_status": rec.get("verification_status", "self_reported"),
                "status": "unverified",
                "source": "User Medical History Log",
                "schedule_version": schedule_version,
                "effective_date": EFFECTIVE_DATE,
                "explanation": "Recorded dose logged in user profile outside standard primary catalog rules.",
            })

    # Sort items chronologically by due date / administered date
    completed_items.sort(key=lambda x: x.get("administered_date") or x.get("due_date", ""))
    upcoming_items.sort(key=lambda x: x.get("due_date", ""))
    overdue_items.sort(key=lambda x: x.get("due_date", ""))

    return {
        "member_id": str(member_profile.get("id", member_profile.get("_id", ""))),
        "member_name": member_profile.get("name", "Member"),
        "date_of_birth": member_dob,
        "calculated_age_days": member_age_days,
        "calculated_age_label": f"{years_approx} years old" if years_approx >= 1 else f"{round(member_age_days / 30.4)} months old",
        "country": country,
        "region": region,
        "schedule_version": schedule_version,
        "effective_date": EFFECTIVE_DATE,
        "source": DEFAULT_SOURCE,
        "summary": {
            "total_rules": len(catalog_rules),
            "completed_count": len(completed_items),
            "upcoming_count": len(upcoming_items),
            "overdue_count": len(overdue_items),
            "unverified_count": len(unverified_items),
        },
        "completed": completed_items,
        "upcoming": upcoming_items,
        "overdue": overdue_items,
        "unknown_unverified": unverified_items,
    }
