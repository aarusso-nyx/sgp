CREATE TABLE avaliacao.career_plan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    instituting_law text NOT NULL,
    starts_on date NOT NULL,
    ends_on date,
    class_count integer NOT NULL,
    reference_count integer NOT NULL,
    progression_rule text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT career_plan_class_count_positive CHECK ((class_count > 0)),
    CONSTRAINT career_plan_dates_valid CHECK (((ends_on IS NULL) OR (ends_on >= starts_on))),
    CONSTRAINT career_plan_reference_count_positive CHECK ((reference_count > 0))
);

CREATE TABLE avaliacao.career_plan_job_position (
    career_plan_id uuid NOT NULL,
    job_position_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
