from datetime import datetime
import uuid

import sqlalchemy as sa
from sqlmodel import Field, SQLModel
from sqlalchemy import UniqueConstraint


class CourseFavorite(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "tenant_id",
            "course_id",
            name="uq_coursefavorite_user_tenant_course",
        ),
        sa.Index("ix_coursefavorite_tenant_user", "tenant_id", "user_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
