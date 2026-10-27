package th.ac.kku.freelance_hub.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import th.ac.kku.freelance_hub.exception.FinanceException;

/** Monetary rules shared by invoice commands. All accepted amounts have two decimal places. */
public final class FinancePolicy {
    private FinancePolicy() {}

    public record Line(String description,
                       @Schema(description="Quantity with up to three decimal places",example="1.250") String quantity,
                       String unit,
                       @Schema(description="THB unit price excluding VAT, decimal string",example="1200.00") String unitPrice) {}
    public record CalculatedLine(String description, BigDecimal quantity, String unit, BigDecimal unitPrice,
                                 BigDecimal amount) {}
    public record LineResponse(String description, String quantity, String unit, String unitPrice, String amount) {}
    public record Total(List<CalculatedLine> lines, BigDecimal subtotal, BigDecimal discount,
                        BigDecimal vatRate, BigDecimal vat, BigDecimal total) {}

    public static BigDecimal money(String value, boolean positive) {
        if (value == null || !value.matches("\\d{1,15}(?:\\.\\d{1,2})?"))
            throw bad("Amount must be a decimal string with at most two decimal places");
        BigDecimal amount = new BigDecimal(value).setScale(2);
        if (positive && amount.signum() <= 0) throw bad("Amount must be greater than zero");
        return amount;
    }

    public static Total calculate(List<Line> input, String discountValue, String vatRateValue) {
        if (input == null || input.isEmpty() || input.size() > 100) throw bad("Invoice needs 1–100 lines");
        BigDecimal discount = money(discountValue == null ? "0" : discountValue, false);
        BigDecimal rate;
        try {
            if (vatRateValue != null && !vatRateValue.matches("\\d{1,3}(?:\\.\\d{1,2})?")) throw bad("Invalid VAT rate");
            rate = new BigDecimal(vatRateValue == null ? "0" : vatRateValue);
        }
        catch (NumberFormatException ex) { throw bad("Invalid VAT rate"); }
        if (rate.scale() > 2 || rate.signum() < 0 || rate.compareTo(new BigDecimal("100")) > 0)
            throw bad("VAT rate must be between 0 and 100");
        List<CalculatedLine> lines = input.stream().map(line -> {
            if (line == null) throw bad("Invalid invoice line");
            if (line.description() == null || line.description().isBlank() || line.description().length() > 500)
                throw bad("Each line needs a description");
            BigDecimal quantity;
            try {
                if (line.quantity() == null || !line.quantity().matches("\\d{1,12}(?:\\.\\d{1,3})?")) throw bad("Invalid quantity");
                quantity = new BigDecimal(line.quantity());
            }
            catch (Exception ex) { throw bad("Invalid quantity"); }
            if (quantity.signum() <= 0 || quantity.scale() > 3 || quantity.setScale(3).precision() > 15)
                throw bad("Quantity must be positive with at most three decimal places");
            if (line.unit() != null && line.unit().length() > 40) throw bad("Unit is too long");
            BigDecimal price = money(line.unitPrice(), false);
            BigDecimal lineAmount=quantity.multiply(price).setScale(2, RoundingMode.HALF_UP);
            if (lineAmount.precision() > 17) throw bad("Line amount exceeds supported amount");
            return new CalculatedLine(line.description().trim(), quantity,
                    line.unit() == null ? "" : line.unit().trim(), price,
                    lineAmount);
        }).toList();
        BigDecimal subtotal = lines.stream().map(CalculatedLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2);
        if (subtotal.precision() > 17) throw bad("Subtotal exceeds supported amount");
        if (discount.compareTo(subtotal) > 0) throw bad("Discount exceeds subtotal");
        BigDecimal net = subtotal.subtract(discount);
        BigDecimal vat = net.multiply(rate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        if (net.add(vat).precision() > 17) throw bad("Invoice total exceeds supported amount");
        return new Total(lines, subtotal, discount, rate, vat, net.add(vat));
    }

    public static BigDecimal allocateVat(BigDecimal base, BigDecimal remainingBase, BigDecimal rate,
                                         BigDecimal remainingVat) {
        if (remainingVat.signum() < 0 || base.compareTo(remainingBase) > 0) throw bad("Invalid remaining tax balance");
        return base.compareTo(remainingBase) == 0 ? remainingVat
                : base.multiply(rate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP).min(remainingVat);
    }

    private static FinanceException bad(String message) {
        return new FinanceException(HttpStatus.BAD_REQUEST, "FINANCE_VALIDATION", message);
    }
}
