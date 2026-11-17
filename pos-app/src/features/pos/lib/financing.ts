import type { FinancingForm, FinancingPayload } from "../types/pos.types";

export const HOME_CREDIT = "home_credit";

export function emptyFinancingForm(): FinancingForm {
  return {
    loanAccountNumber: "",
    deliveryAdviceRef: "",
    financedAmount: "",
    downpaymentAmount: "",
    approvedDate: "",
  };
}

export function isFinancingComplete(form: FinancingForm): boolean {
  const loanAccountNumber = form.loanAccountNumber.trim();
  const deliveryAdviceRef = form.deliveryAdviceRef.trim();
  const financedAmount = Number(form.financedAmount);
  const downpaymentAmount = Number(form.downpaymentAmount);

  return Boolean(
    loanAccountNumber &&
    deliveryAdviceRef &&
    form.financedAmount.trim() !== "" &&
    Number.isFinite(financedAmount) &&
    financedAmount > 0 &&
    form.downpaymentAmount.trim() !== "" &&
    Number.isFinite(downpaymentAmount) &&
    downpaymentAmount >= 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.approvedDate.trim()),
  );
}

export function toFinancingPayload(form: FinancingForm): FinancingPayload {
  return {
    provider: "Home Credit",
    loan_account_number: form.loanAccountNumber.trim(),
    delivery_advice_ref: form.deliveryAdviceRef.trim(),
    financed_amount: Number(form.financedAmount),
    downpayment_amount: Number(form.downpaymentAmount),
    approved_date: form.approvedDate.trim(),
  };
}
