UPDATE payments
SET period = DATE_FORMAT(payment_date, '%Y-%m')
WHERE (period IS NULL OR period = '')
  AND payment_date IS NOT NULL;
