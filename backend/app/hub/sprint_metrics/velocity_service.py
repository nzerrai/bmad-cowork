"""Velocity calculation service for team performance tracking.

Calculates velocity metrics deterministically from completed story data
and story points.
"""

from datetime import datetime, timedelta, timezone
from typing import List, NamedTuple

from sqlalchemy.orm import Session


class VelocityDataPoint(NamedTuple):
    """Data point for velocity chart."""
    sprint_or_week: str
    story_points_completed: int
    stories_completed: int


def get_completed_stories_by_sprint(db: Session, sprint_id: str) -> List[dict]:
    """Get completed stories with story points for a specific sprint.

    This is a placeholder that should be implemented according to the actual
    story state models in the database. The implementation should return stories
    that were completed in the sprint with their story point values.
    """
    # This would query the story state/history tables to get completed stories
    # with their story points for the sprint. For now, returning an empty list.
    return []


def get_completed_stories_by_week(db: Session, start_date: str, end_date: str) -> List[dict]:
    """Get completed stories with story points within a date range (week).

    This is a placeholder that should be implemented according to the actual
    story state models in the database. The implementation should return stories
    that were completed within the date range with their story point values.
    """
    # This would query the story state/history tables to get completed stories
    # within the date range with their story points. For now, returning an empty list.
    return []


def calculate_velocity_data(
    db: Session,
    sprint_id: str,
    sprint_start_date: str,
    sprint_end_date: str,
) -> List[VelocityDataPoint]:
    """Calculate velocity metrics deterministically from completed story data.

    Generates a velocity chart data series showing completed story points over
    time (per sprint or per week).

    Args:
        db: Database session
        sprint_id: The sprint identifier
        sprint_start_date: Start date of the sprint (ISO format string)
        sprint_end_date: End date of the sprint (ISO format string)

    Returns:
        List of VelocityDataPoint objects with sprint_or_week, story_points_completed,
        and stories_completed
    """
    # Parse dates
    try:
        start_dt = datetime.fromisoformat(sprint_start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(sprint_end_date.replace('Z', '+00:00'))
    except ValueError:
        # Fallback to default parsing
        start_dt = datetime.now(timezone.utc)
        end_dt = start_dt + timedelta(days=14)  # type: ignore

    # Get completed stories for the sprint
    completed_stories = get_completed_stories_by_sprint(db, sprint_id)

    # Calculate total story points and stories completed
    total_story_points = 0
    total_stories_completed = 0

    for story in completed_stories:
        # Count only completed stories
        if story.get('status') == 'completed':
            story_points = story.get('story_points', 0) or 0
            total_story_points += story_points
            total_stories_completed += 1

    return [
        VelocityDataPoint(
            sprint_or_week=f"Sprint {sprint_id}",
            story_points_completed=total_story_points,
            stories_completed=total_stories_completed,
        )
    ]


def calculate_velocity_history(
    db: Session,
    num_sprints: int = 5,
) -> List[VelocityDataPoint]:
    """Calculate velocity history over multiple sprints.

    Generates velocity data points for the last N sprints to show team velocity trends.

    Args:
        db: Database session
        num_sprints: Number of sprints to include in the history

    Returns:
        List of VelocityDataPoint objects for each sprint
    """
    velocity_history = []

    # This would query the completed sprints from the database
    # For now, we return an empty list as the actual data model integration
    # is pending.

    return velocity_history
