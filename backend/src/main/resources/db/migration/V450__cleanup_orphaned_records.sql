-- Cleanup orphaned records where the foreign key references a deleted employee
-- This fixes the EntityNotFoundException (500 Internal Server Error) on GET endpoints

DELETE FROM specific_activities WHERE employee_id NOT IN (SELECT id FROM employees);
DELETE FROM vacation_coverages WHERE substitute_employee_id NOT IN (SELECT id FROM employees);
DELETE FROM work_post_assignments WHERE employee_id NOT IN (SELECT id FROM employees);
DELETE FROM remanejamentos WHERE employee_id NOT IN (SELECT id FROM employees);
