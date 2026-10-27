package th.ac.kku.freelance_hub.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.util.List;
import org.junit.jupiter.api.Test;

class FinancePolicyTest {
    @Test void roundsEachLineThenDiscountsAndCalculatesVat() {
        FinancePolicy.Total total = FinancePolicy.calculate(List.of(
                new FinancePolicy.Line("Design", "1.333", "hour", "100.01"),
                new FinancePolicy.Line("Review", "2", "hour", "50.00")), "10.00", "7");
        assertThat(total.lines().get(0).amount().toPlainString()).isEqualTo("133.31");
        assertThat(total.subtotal().toPlainString()).isEqualTo("233.31");
        assertThat(total.vat().toPlainString()).isEqualTo("15.63");
        assertThat(total.total().toPlainString()).isEqualTo("238.94");
    }
    @Test void rejectsSubcentMoneyAndOverDiscount() {
        assertThatThrownBy(() -> FinancePolicy.money("1.001", true)).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> FinancePolicy.calculate(List.of(
                new FinancePolicy.Line("Service", "1", "unit", "1.00")), "1.01", "0"))
                .isInstanceOf(RuntimeException.class);
    }
    @Test void capsRoundedInstallmentVatAndKeepsFinalResidualNonnegative() {
        java.math.BigDecimal remaining = new java.math.BigDecimal("0.02");
        for (int installment=0; installment<4; installment++) {
            java.math.BigDecimal vat = FinancePolicy.allocateVat(new java.math.BigDecimal("0.08"),
                    new java.math.BigDecimal("0.32").subtract(new java.math.BigDecimal("0.08").multiply(java.math.BigDecimal.valueOf(installment))),
                    new java.math.BigDecimal("7"), remaining);
            assertThat(vat.signum()).isGreaterThanOrEqualTo(0);
            remaining=remaining.subtract(vat);
        }
        assertThat(remaining).isEqualByComparingTo("0.00");
    }
    @Test void rejectsQuantityAndTotalBeyondDatabasePrecision() {
        assertThatThrownBy(() -> FinancePolicy.calculate(List.of(
                new FinancePolicy.Line("Service", "1000000000000", "unit", "1")), "0", "0"))
                .isInstanceOf(th.ac.kku.freelance_hub.exception.FinanceException.class);
        assertThatThrownBy(() -> FinancePolicy.calculate(List.of(
                new FinancePolicy.Line("Service", "2", "unit", "999999999999999")), "0", "0"))
                .isInstanceOf(th.ac.kku.freelance_hub.exception.FinanceException.class);
    }
}
