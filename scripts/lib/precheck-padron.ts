// Read-only counts to review before applying migration 0010 (only numbers, never personal data).
// Uses tables that already exist before 0010, so it can run against production first.
export const PRECHECK_EMAIL = `
  SELECT
    count(*) FILTER (WHERE (p.email IS NULL OR trim(p.email) = '') AND a.notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$') AS completar,
    count(*) FILTER (WHERE trim(p.email) <> '' AND lower(trim(p.email)) = lower(trim(a.notification_email))) AS coinciden,
    count(*) FILTER (WHERE trim(p.email) <> '' AND lower(trim(p.email)) <> lower(trim(a.notification_email))) AS conflicto
  FROM members m JOIN admissions a ON a.id = m.admission_id JOIN persons p ON p.id = m.person_id
  WHERE trim(coalesce(a.notification_email, '')) <> ''`;

export const PRECHECK_MEMBERS = `
  SELECT
    count(*) AS socios,
    count(*) FILTER (WHERE m.admission_id IS NOT NULL) AS por_admision,
    count(*) FILTER (WHERE m.origin = 'legacy') AS existentes,
    count(*) FILTER (WHERE m.member_number IS NOT NULL) AS numeros_al_historial,
    (SELECT count(*) FROM (SELECT lower(member_number) FROM members WHERE member_number IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d) AS numeros_duplicados
  FROM members m`;

// Structural state: which migrations ran and whether anything 0010/0011 creates already exists.
export const PRECHECK_STRUCTURE = `
  SELECT
    (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migraciones_aplicadas,
    (SELECT count(*) FROM unnest(ARRAY['import_runs','member_fee_settings','member_notes','member_numbers']) t WHERE to_regclass('public.' || t) IS NOT NULL) AS tablas_nuevas_ya_existentes,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'persons' AND column_name IN ('first_names','last_names','address','postal_code')) OR (table_name = 'members' AND column_name IN ('room','import_run_id')))) AS columnas_nuevas_ya_existentes,
    (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'reprocann_permit_status' AND e.enumlabel = 'no_informado') AS enum_ya_existente,
    (SELECT count(*) FROM members WHERE user_id IS NULL OR member_number IS NULL OR category IS NULL) AS socios_con_nulos`;
