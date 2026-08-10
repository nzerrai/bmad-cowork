"""Burn-down calculation service for sprint progress tracking.

Calculates burn-down metrics deterministically from sprint data and story
completion over time.
"""

from datetime import datetime, timedelta, timezone
from typing import List, NamedTuple

from sqlalchemy.orm import Session

from app.story_state import StoryStatus


class BurnDownDataPoint(NamedTuple):
    """Data point for burn-down chart."""
    date: str
    stories_remaining: int


def get_stories_by_date(db: Session, sprint_id: str, end_date: datetime) -> List[dict]:
    """Get all stories and their completion dates for a sprint up to the given end date.

    This is a placeholder that should be implemented according to the actual
    story state models in the database. The implementation should return stories
    with their completion status over time.
    """
    # This would query the story state/history tables to get stories completed
    # per day in the sprint. For now, returning an empty list as the actual
    # data model integration is pending.
    return []


def calculate_burn_down_data(
    db: Session,
    sprint_id: str,
    sprint_start_date: str,
    sprint_end_date: str,
    total_stories: int,
) -> List[BurnDownDataPoint]:
    """Calculate burn-down metrics deterministically from sprint data.

    Generates a burn-down chart data series showing remaining stories over time
    from the sprint start date to the sprint end date.

    Args:
        db: Database session
        sprint_id: The sprint identifier
        sprint_start_date: Start date of the sprint (ISO format string)
        sprint_end_date: End date of the sprint (ISO format string)
        total_stories: Total number of stories in the sprint

    Returns:
        List of BurnDownDataPoint objects with date and stories_remaining
    """
    # Parse dates
    try:
        start_dt = datetime.fromisoformat(sprint_start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(sprint_end_date.replace('Z', '+00:00'))
    except ValueError:
        # Fallback to default parsing
        start_dt = datetime.now(timezone.utc)
        end_dt = start_dt + timedelta(days=14)

    # Calculate total days in sprint
    total_days = (end_dt - start_dt).days
    if total_days < 1:
        total_days = 1

    # Generate data points for each day in the sprint
    burn_down_data = []

    # Get actual story completion data
    stories = get_stories_by_date(db, sprint_id, end_dt)

    # Calculate cumulative completed stories up to each day
    for day_offset in range(total_days + 1):
        current_date = start_dt + timedelta(days=day_offset)

        if current_date > end_dt:
            break

        # Calculate stories remaining for this date
        if total_stories == 0:
            stories_remaining = 0
        else:
            # Count completed stories up to this date
            completed_up_to_date = 0
            for story in stories:
                if story.get('completed_at') and story.get('completed_at') <= current_date:
                    completed_up_to_date += 1

            stories_remaining = max(0, total_stories - completed_up_to_date)

        # Format date as ISO string (date only)
        date_str = current_date.strftime('%Y-%m-%d')

        burn_down_data.append(BurnDownDataPoint(
            date=date_str,
            stories_remaining=stories_remaining,
        ))

    return burn_down_data
