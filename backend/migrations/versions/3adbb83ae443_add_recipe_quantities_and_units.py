"""Add recipe quantities and units

Revision ID: (will be auto-generated)
Revises: (will be auto-generated)
Create Date: (will be auto-generated)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

def upgrade():
    # Disable foreign key checks temporarily
    op.execute('SET FOREIGN_KEY_CHECKS=0')
    
    # Step 1: Add the new columns to recipe_ingredients3 table
    op.add_column('recipe_ingredients3',
        sa.Column('recipe_quantities', mysql.JSON, nullable=True)
    )
    op.add_column('recipe_ingredients3',
        sa.Column('recipe_units', mysql.JSON, nullable=True)
    )
    
    # Step 2: Initialize the new JSON columns
    op.execute("""
        UPDATE recipe_ingredients3 
        SET recipe_quantities = '{}',
            recipe_units = '{}'
        WHERE recipe_quantities IS NULL
    """)
    
    # Step 3: Convert existing quantity and unit data to JSON format
    op.execute("""
        UPDATE recipe_ingredients3 ri
        SET recipe_quantities = JSON_OBJECT(
                JSON_EXTRACT(recipe_ids, '$[0]'), 
                IFNULL(quantity, 0)
            ),
            recipe_units = JSON_OBJECT(
                JSON_EXTRACT(recipe_ids, '$[0]'), 
                IFNULL(unit, '')
            )
        WHERE quantity IS NOT NULL OR unit IS NOT NULL
    """)
    
    # Step 4: Drop the old columns
    op.drop_column('recipe_ingredients3', 'quantity')
    op.drop_column('recipe_ingredients3', 'unit')
    
    # Re-enable foreign key checks
    op.execute('SET FOREIGN_KEY_CHECKS=1')

def downgrade():
    # Disable foreign key checks temporarily
    op.execute('SET FOREIGN_KEY_CHECKS=0')
    
    # Step 1: Add back the original columns
    op.add_column('recipe_ingredients3',
        sa.Column('quantity', sa.Float, nullable=True)
    )
    op.add_column('recipe_ingredients3',
        sa.Column('unit', sa.String(20), nullable=True)
    )
    
    # Step 2: Move data back to original format
    op.execute("""
        UPDATE recipe_ingredients3 
        SET quantity = JSON_EXTRACT(recipe_quantities, '$."1"'),
            unit = JSON_EXTRACT(recipe_units, '$."1"')
        WHERE recipe_quantities IS NOT NULL OR recipe_units IS NOT NULL
    """)
    
    # Step 3: Drop the JSON columns
    op.drop_column('recipe_ingredients3', 'recipe_quantities')
    op.drop_column('recipe_ingredients3', 'recipe_units')
    
    # Re-enable foreign key checks
    op.execute('SET FOREIGN_KEY_CHECKS=1')