-- Adicionar work_post_id à tabela employee_certifications para rastrear o posto de trabalho onde o treinamento foi realizado

-- Adicionar coluna work_post_id
ALTER TABLE employee_certifications 
ADD COLUMN IF NOT EXISTS work_post_id UUID;

-- Adicionar foreign key para work_posts
ALTER TABLE employee_certifications 
ADD CONSTRAINT fk_employee_certifications_work_post 
FOREIGN KEY (work_post_id) 
REFERENCES work_posts(id) 
ON DELETE SET NULL;

-- Adicionar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_employee_certifications_work_post 
ON employee_certifications(work_post_id);

