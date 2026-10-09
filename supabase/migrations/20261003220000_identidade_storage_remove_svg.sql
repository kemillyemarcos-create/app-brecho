-- ============================================================================
-- STORAGE / IDENTIDADE VISUAL
-- Remove SVG dos formatos aceitos pelo bucket identidade-empresas.
-- Mantém PNG, JPEG, WebP e ICO.
-- ============================================================================

update storage.buckets
set allowed_mime_types = array[
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon'
]::text[]
where id = 'identidade-empresas';
