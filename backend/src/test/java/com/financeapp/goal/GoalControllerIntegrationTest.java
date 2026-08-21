package com.financeapp.goal;

import com.financeapp.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GoalControllerIntegrationTest extends AbstractIntegrationTest {

    private Session setUpUser(String emailSeed) throws Exception {
        return registerAndLogin(emailSeed + "@example.com", "senha1234");
    }

    private String goalJson(String name, String targetAmount, String targetDate) {
        String dateField = targetDate == null ? "null" : "\"" + targetDate + "\"";
        return """
                {"name": "%s", "targetAmount": %s, "targetDate": %s}
                """.formatted(name, targetAmount, dateField);
    }

    private String updateJson(String name, String targetAmount, String targetDate, String status) {
        String dateField = targetDate == null ? "null" : "\"" + targetDate + "\"";
        return """
                {"name": "%s", "targetAmount": %s, "targetDate": %s, "status": "%s"}
                """.formatted(name, targetAmount, dateField, status);
    }

    private String contributionJson(String amount, String date) {
        return """
                {"amount": %s, "date": "%s"}
                """.formatted(amount, date);
    }

    private Long createGoal(Session session, String name, String targetAmount) throws Exception {
        var result = mockMvc.perform(authed(post("/api/goals"), session)
                        .contentType(APPLICATION_JSON)
                        .content(goalJson(name, targetAmount, null)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsByteArray(), com.financeapp.goal.dto.FinancialGoalResponse.class).id();
    }

    private Long addContribution(Session session, Long goalId, String amount, String date) throws Exception {
        var result = mockMvc.perform(authed(post("/api/goals/" + goalId + "/contributions"), session)
                        .contentType(APPLICATION_JSON)
                        .content(contributionJson(amount, date)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsByteArray(), com.financeapp.goal.dto.GoalContributionResponse.class).id();
    }

    // ---------- CRUD ----------

    @Test
    void create_returns201_withZeroProgress() throws Exception {
        Session session = setUpUser("goal-create");

        mockMvc.perform(authed(post("/api/goals"), session)
                        .contentType(APPLICATION_JSON)
                        .content(goalJson("Reserva de emergência", "20000.00", null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.currentAmount").value(0))
                .andExpect(jsonPath("$.remainingAmount").value(20000.00))
                .andExpect(jsonPath("$.progressPercentage").value(0))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void create_withNonPositiveTargetAmount_returns400() throws Exception {
        Session session = setUpUser("goal-badtarget");

        mockMvc.perform(authed(post("/api/goals"), session)
                        .contentType(APPLICATION_JSON)
                        .content(goalJson("Meta", "0", null)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_withPastTargetDate_returns400() throws Exception {
        Session session = setUpUser("goal-pastdate");

        mockMvc.perform(authed(post("/api/goals"), session)
                        .contentType(APPLICATION_JSON)
                        .content(goalJson("Meta", "100.00", LocalDate.now().minusDays(1).toString())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void get_withGoalFromAnotherUser_returns404() throws Exception {
        Session session = setUpUser("goal-cross");
        Session other = setUpUser("goal-cross-other");
        Long goalId = createGoal(session, "Meta", "1000.00");

        mockMvc.perform(authed(get("/api/goals/" + goalId), other))
                .andExpect(status().isNotFound());
    }

    @Test
    void update_changesNameAndTarget() throws Exception {
        Session session = setUpUser("goal-update");
        Long goalId = createGoal(session, "Meta", "1000.00");

        mockMvc.perform(authed(put("/api/goals/" + goalId), session)
                        .contentType(APPLICATION_JSON)
                        .content(updateJson("Meta renomeada", "1500.00", null, "ACTIVE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Meta renomeada"))
                .andExpect(jsonPath("$.targetAmount").value(1500.00));
    }

    @Test
    void update_withStatusCompleted_returns400() throws Exception {
        Session session = setUpUser("goal-manual-complete");
        Long goalId = createGoal(session, "Meta", "1000.00");

        mockMvc.perform(authed(put("/api/goals/" + goalId), session)
                        .contentType(APPLICATION_JSON)
                        .content(updateJson("Meta", "1000.00", null, "COMPLETED")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void delete_removesGoal_andCascadesContributions() throws Exception {
        Session session = setUpUser("goal-delete");
        Long goalId = createGoal(session, "Meta", "1000.00");
        addContribution(session, goalId, "100.00", LocalDate.now().toString());

        mockMvc.perform(authed(delete("/api/goals/" + goalId), session))
                .andExpect(status().isNoContent());
        mockMvc.perform(authed(get("/api/goals/" + goalId), session))
                .andExpect(status().isNotFound());
    }

    // ---------- contribuições ----------

    @Test
    void addContribution_updatesProgress() throws Exception {
        Session session = setUpUser("goal-contrib-progress");
        Long goalId = createGoal(session, "Meta", "1000.00");
        addContribution(session, goalId, "250.00", LocalDate.now().toString());

        mockMvc.perform(authed(get("/api/goals/" + goalId), session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentAmount").value(250.00))
                .andExpect(jsonPath("$.remainingAmount").value(750.00))
                .andExpect(jsonPath("$.progressPercentage").value(25.00))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void contribution_reachingTarget_completesGoalAutomatically() throws Exception {
        Session session = setUpUser("goal-autocomplete");
        Long goalId = createGoal(session, "Meta", "1000.00");
        addContribution(session, goalId, "1000.00", LocalDate.now().toString());

        mockMvc.perform(authed(get("/api/goals/" + goalId), session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.remainingAmount").value(0));
    }

    @Test
    void contribution_exceedingTarget_completesGoal() throws Exception {
        Session session = setUpUser("goal-overcomplete");
        Long goalId = createGoal(session, "Meta", "1000.00");
        addContribution(session, goalId, "1200.00", LocalDate.now().toString());

        mockMvc.perform(authed(get("/api/goals/" + goalId), session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.progressPercentage").value(120.00));
    }

    @Test
    void removingContribution_belowTarget_revertsGoalToActive() throws Exception {
        Session session = setUpUser("goal-revert");
        Long goalId = createGoal(session, "Meta", "1000.00");
        Long contributionId = addContribution(session, goalId, "1000.00", LocalDate.now().toString());

        mockMvc.perform(authed(get("/api/goals/" + goalId), session))
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mockMvc.perform(authed(delete("/api/goals/" + goalId + "/contributions/" + contributionId), session))
                .andExpect(status().isNoContent());

        mockMvc.perform(authed(get("/api/goals/" + goalId), session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.currentAmount").value(0));
    }

    @Test
    void contribution_crossUserGoal_returns404() throws Exception {
        Session session = setUpUser("goal-contrib-cross");
        Session other = setUpUser("goal-contrib-cross-other");
        Long goalId = createGoal(session, "Meta", "1000.00");

        mockMvc.perform(authed(post("/api/goals/" + goalId + "/contributions"), other)
                        .contentType(APPLICATION_JSON)
                        .content(contributionJson("100.00", LocalDate.now().toString())))
                .andExpect(status().isNotFound());
    }

    @Test
    void removeContribution_crossUser_returns404() throws Exception {
        Session session = setUpUser("goal-remove-cross");
        Session other = setUpUser("goal-remove-cross-other");
        Long goalId = createGoal(session, "Meta", "1000.00");
        Long contributionId = addContribution(session, goalId, "100.00", LocalDate.now().toString());

        mockMvc.perform(authed(delete("/api/goals/" + goalId + "/contributions/" + contributionId), other))
                .andExpect(status().isNotFound());
    }

    // ---------- cancelamento ----------

    @Test
    void cancelledGoal_isNotRevertedByRecalculation() throws Exception {
        Session session = setUpUser("goal-cancelled");
        Long goalId = createGoal(session, "Meta", "1000.00");

        mockMvc.perform(authed(put("/api/goals/" + goalId), session)
                        .contentType(APPLICATION_JSON)
                        .content(updateJson("Meta", "1000.00", null, "CANCELLED")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        addContribution(session, goalId, "1000.00", LocalDate.now().toString());

        mockMvc.perform(authed(get("/api/goals/" + goalId), session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    // ---------- listagem ----------

    @Test
    void list_filtersByStatus() throws Exception {
        Session session = setUpUser("goal-list-filter");
        Long active = createGoal(session, "Ativa", "1000.00");
        Long cancelled = createGoal(session, "Cancelada", "1000.00");
        mockMvc.perform(authed(put("/api/goals/" + cancelled), session)
                        .contentType(APPLICATION_JSON)
                        .content(updateJson("Cancelada", "1000.00", null, "CANCELLED")))
                .andExpect(status().isOk());

        mockMvc.perform(authed(get("/api/goals").param("status", "ACTIVE"), session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(active));
    }
}
