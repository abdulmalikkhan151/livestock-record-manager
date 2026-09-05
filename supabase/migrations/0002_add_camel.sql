-- Add Camel support to databases that already ran 0001_initial.sql.
alter type public.animal_species add value if not exists 'Camel';
