"""add org vapi_assistant_id

Revision ID: a1b2c3d4e5f6
Revises: f6752a385604
Create Date: 2026-07-03 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f6752a385604'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('vapi_assistant_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_organizations_vapi_assistant_id'), 'organizations', ['vapi_assistant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_organizations_vapi_assistant_id'), table_name='organizations')
    op.drop_column('organizations', 'vapi_assistant_id')
