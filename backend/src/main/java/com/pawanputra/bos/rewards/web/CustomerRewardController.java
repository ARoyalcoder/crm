package com.pawanputra.bos.rewards.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.rewards.internal.CustomerRewardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/customers/{customerId}/rewards")
@Tag(name = "Rewards - Customer Rewards")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class CustomerRewardController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.REWARDS_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.REWARDS_MANAGE + "')";

    private final CustomerRewardService service;

    public CustomerRewardController(CustomerRewardService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get the loyalty reward record for a customer (creates one if absent)")
    public RewardViews.CustomerRewardView get(@PathVariable UUID customerId) {
        CurrentUser user = CurrentUser.require();
        return RewardViews.CustomerRewardView.from(service.get(customerId, user.organizationId()));
    }

    @GetMapping("/history")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get the reward transaction history for a customer")
    public List<RewardViews.RewardTransactionView> getHistory(@PathVariable UUID customerId) {
        CurrentUser user = CurrentUser.require();
        return service.getHistory(customerId, user.organizationId())
                .stream()
                .map(RewardViews.RewardTransactionView::from)
                .toList();
    }

    @PostMapping("/add-points")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Manually add (or adjust) points for a customer")
    public RewardViews.CustomerRewardView addPoints(
            @PathVariable UUID customerId,
            @Valid @RequestBody RewardDtos.AddPointsRequest request) {
        CurrentUser user = CurrentUser.require();
        UUID refId = request.referenceId() != null ? UUID.fromString(request.referenceId()) : null;
        return RewardViews.CustomerRewardView.from(
                service.addPoints(customerId, request.points(), request.reason(),
                        request.referenceType(), refId, user.organizationId()));
    }

    @PostMapping("/redeem")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Redeem points for a customer")
    public RewardViews.CustomerRewardView redeem(
            @PathVariable UUID customerId,
            @Valid @RequestBody RewardDtos.RedeemPointsRequest request) {
        CurrentUser user = CurrentUser.require();
        return RewardViews.CustomerRewardView.from(
                service.redeemPoints(customerId, request.points(), request.reason(),
                        user.organizationId()));
    }
}
