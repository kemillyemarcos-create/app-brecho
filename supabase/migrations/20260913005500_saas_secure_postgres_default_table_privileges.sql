-- Endurece os DEFAULT PRIVILEGES das futuras tabelas criadas pelo role postgres.
--
-- Mantém os privilégios normais necessários à aplicação:
-- SELECT / INSERT / UPDATE / DELETE
--
-- Remove privilégios administrativos que não devem ser concedidos
-- automaticamente ao papel authenticated.

alter default privileges
for role postgres
in schema public
revoke truncate, trigger, references, maintain
on tables
from authenticated;
