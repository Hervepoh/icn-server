CREATE OR REPLACE VIEW v_transaction_integration_documents AS
SELECT 
    id.transactionId,
    id.reference,
    id.transaction_id,
    id.bill_account_number,
    id.bill_number,
    td.date AS billingDate,
    t.name AS customerName,
    id.paid_amount,
    id.paid_date,
    GREATEST(td.amountTopaid - td.amountUnpaid, 0) AS advancePayment
FROM 
    integration_documents id 
JOIN 
    transaction_details td ON id.transactionDetailsId = td.id 
JOIN 
    transactions t ON id.transactionId = t.id;


CREATE VIEW v_transactions AS
SELECT 
t.id,
t.reference,
t.name,
t.amount,
t.bankId,
b.name bank,
t.paymentDate,
t.paymentModeId,
p.name paymentMode,
t.description,
t.statusId,
s.name status,
t.validatorId,
uv.name validator,
t.validatedAt,
t.assignBy,
t.assignAt,
t.refusal,
t.reasonForRefusal,
t.unitId,
units.name unit
FROM transactions t 
JOIN status s ON t.statusId=s.id 
JOIN banks b ON t.bankId=b.id 
JOIN payment_modes p ON t.paymentModeId=p.id
LEFT JOIN users uv ON t.validatorId=uv.id
LEFT JOIN users ua ON t.assignBy=ua.id
LEFT JOIN units ON t.unitId=units.id;


CREATE OR REPLACE VIEW v_users AS
SELECT 
    u.id, 
    u.name, 
    u.email, 
    u.ldap, 
    CASE 
        WHEN u.deleted = 1 THEN 'inactive'
        ELSE 'active'
    END AS status,
    u.deleted,
    u.deletedAt,
    GROUP_CONCAT(r.name SEPARATOR ', ') AS roles, 
    ut.name AS unit,
    u.created_at AS createdAt,
    u.updated_at AS updatedAt
FROM 
    users u
LEFT JOIN 
    user_roles ur ON u.id = ur.userId
LEFT JOIN 
    roles r ON r.id = ur.roleId
LEFT JOIN 
    units ut ON ut.id = u.unitId 
GROUP BY 
    u.id, u.name, u.email, u.ldap, ut.name
ORDER BY 
    u.created_at DESC;


CREATE OR REPLACE VIEW v_users_id AS
SELECT 
    u.id, 
    u.name, 
    u.email, 
    u.ldap, 
    u.password,
    u.deleted,
    GROUP_CONCAT(r.id SEPARATOR ', ') AS roleId, 
    ut.id AS unitId
FROM 
    users u
LEFT JOIN 
    user_roles ur ON u.id = ur.userId
LEFT JOIN 
    roles r ON r.id = ur.roleId
LEFT JOIN 
    units ut ON ut.id = u.unitId 
GROUP BY 
    u.id, u.name, u.email, u.ldap, ut.id
ORDER BY 
    u.created_at DESC;