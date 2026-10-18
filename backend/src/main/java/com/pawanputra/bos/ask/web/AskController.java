package com.pawanputra.bos.ask.web;

import com.pawanputra.bos.ask.api.AskTool;
import com.pawanputra.bos.ask.internal.AskResponse;
import com.pawanputra.bos.ask.internal.AskToolExecutor;
import com.pawanputra.bos.ask.internal.QueryMatcher;
import com.pawanputra.bos.ask.web.AskDtos.AskRequest;
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/ask")
@Tag(name = "Ask PAWAN")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AskController {

    private static final String CAN_ASK = "hasAuthority('" + Permissions.ASK_VIEW + "')";

    private final QueryMatcher queryMatcher;
    private final AskToolExecutor askToolExecutor;
    private final com.pawanputra.bos.ask.internal.GeminiAiService geminiAiService;

    public AskController(
            QueryMatcher queryMatcher,
            AskToolExecutor askToolExecutor,
            com.pawanputra.bos.ask.internal.GeminiAiService geminiAiService) {
        this.queryMatcher = queryMatcher;
        this.askToolExecutor = askToolExecutor;
        this.geminiAiService = geminiAiService;
    }

    @PostMapping({"", "/"})
    @PreAuthorize(CAN_ASK)
    @Operation(summary = "Ask a question about your data. Requires ASK_VIEW; each question also needs the permission of the records it reads.")
    public AskResponse ask(@RequestBody AskRequest request) {
        String question = request != null && request.question() != null ? request.question().strip() : "";
        CurrentUser user = CurrentUser.require();
        AskTool tool = queryMatcher.match(question);
        if (tool == AskTool.UNKNOWN && geminiAiService != null && geminiAiService.isEnabled()) {
            return geminiAiService.generateAnswer(question, user);
        }
        return askToolExecutor.execute(tool, question, user);
    }

    @GetMapping("/suggestions")
    @PreAuthorize(CAN_ASK)
    @Operation(summary = "The questions this user can ask, i.e. those whose records they may see. Requires ASK_VIEW.")
    public List<AskToolExecutor.Suggestion> suggestions() {
        return askToolExecutor.suggestions(CurrentUser.require());
    }
}
