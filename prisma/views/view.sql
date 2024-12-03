CREATE VIEW v_transaction_integration_documents AS
SELECT id.transactionId,id.reference,id.transaction_id,id.bill_account_number,id.bill_number,td.date billingDate,t.name customerName,id.paid_amount,id.paid_date, 
td.amountTopaid - td.amountUnpaid as advancePayment
FROM integration_documents id 
JOIN transaction_details td ON id.transactionDetailsId=td.id 
JOIN transactions t on id.transactionId=t.id;


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