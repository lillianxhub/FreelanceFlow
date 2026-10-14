package th.ac.kku.freelance_hub.controller;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import th.ac.kku.freelance_hub.service.FinanceService;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FinanceCommandValidationTest {
    @Test void missingVersionAndBlankReasonCannotReachFinancialWrites() throws Exception {
        var service=mock(FinanceService.class);
        var mvc=MockMvcBuilders.standaloneSetup(new FinanceController(service)).build();
        mvc.perform(post("/api/finance/payments/"+UUID.randomUUID()+"/cancel")
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Mistake\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/finance/invoices/"+UUID.randomUUID()+"/cancel")
                .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"reason\":\" \"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
