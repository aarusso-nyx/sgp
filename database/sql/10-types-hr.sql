CREATE TYPE hr.alimony_calculation_basis AS ENUM (
    'GROSS',
    'NET',
    'BASE_SPECIFIC'
);

CREATE TYPE hr.employee_alimony_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED'
);

CREATE TYPE hr.employee_bank_account_holder_kind AS ENUM (
    'SELF',
    'DEPENDENT'
);

CREATE TYPE hr.employee_bank_account_validation_status AS ENUM (
    'PENDING',
    'VALID',
    'REJECTED'
);

CREATE TYPE hr.employee_transfer_status AS ENUM (
    'solicitada',
    'aprovada',
    'efetivada',
    'indeferida',
    'cancelada'
);

CREATE TYPE hr.employee_transfer_type AS ENUM (
    'oficio',
    'pedido_criterio',
    'pedido_localidade',
    'permuta'
);

CREATE TYPE hr.job_position_category AS ENUM (
    'efetivo',
    'comissionado',
    'temporario',
    'eletivo',
    'emprego_publico'
);

CREATE TYPE hr.progression_status AS ENUM (
    'eligible',
    'simulated',
    'applied',
    'revoked'
);

CREATE TYPE hr.progression_type AS ENUM (
    'merit_horizontal',
    'vertical_promotion'
);

CREATE TYPE hr.reintegration_order_kind AS ENUM (
    'JUDICIAL',
    'ADMINISTRATIVE_ANNULMENT',
    'AMNESTY'
);

CREATE TYPE hr.reintegration_order_status AS ENUM (
    'REGISTERED',
    'APPLIED',
    'TRANSMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE hr.salary_history_reason AS ENUM (
    'reajuste_data_base',
    'correcao',
    'reestruturacao'
);
