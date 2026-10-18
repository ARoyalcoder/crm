package com.pawanputra.bos.recruitment.web;

import com.pawanputra.bos.identity.api.UserDirectory;
import com.pawanputra.bos.recruitment.internal.Application;
import com.pawanputra.bos.recruitment.internal.ApplicationService;
import com.pawanputra.bos.recruitment.internal.ApplicationService.ApplicationDetail;
import com.pawanputra.bos.recruitment.internal.Interview;
import com.pawanputra.bos.recruitment.web.RecruitmentViews.ApplicationDetailView;
import com.pawanputra.bos.recruitment.web.RecruitmentViews.ApplicationView;
import com.pawanputra.bos.recruitment.web.RecruitmentViews.CandidateView;
import com.pawanputra.bos.recruitment.web.RecruitmentViews.InterviewView;
import com.pawanputra.bos.recruitment.web.RecruitmentViews.JobOpeningView;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Builds applications and interviews for the screen with the names behind their ids, so a pipeline can say who
 * applied for what and who is taking an interview. Names are looked up once for the whole list, within the
 * caller's organization only.
 */
@Component
public class RecruitmentViewAssembler {

    private final ApplicationService applications;
    private final UserDirectory users;

    public RecruitmentViewAssembler(ApplicationService applications, UserDirectory users) {
        this.applications = applications;
        this.users = users;
    }

    public List<ApplicationView> applications(UUID organizationId, List<Application> found) {
        if (found.isEmpty()) {
            return List.of();
        }
        var labels = applications.labelsFor(organizationId, found);
        Map<UUID, String> people = names(organizationId, found.stream().map(Application::getAssignedToUserId).toList());
        return found.stream()
                .map(a -> ApplicationView.from(a, labels.candidate(a.getCandidateId()), labels.job(a.getJobId()),
                        people.get(a.getAssignedToUserId())))
                .toList();
    }

    public ApplicationView application(UUID organizationId, Application found) {
        return applications(organizationId, List.of(found)).get(0);
    }

    public ApplicationDetailView detail(UUID organizationId, ApplicationDetail detail) {
        Application application = detail.application();
        List<UUID> personIds = new ArrayList<>();
        personIds.add(application.getAssignedToUserId());
        detail.interviewList().forEach(interview -> personIds.add(interview.getInterviewerUserId()));
        Map<UUID, String> people = names(organizationId, personIds);
        return new ApplicationDetailView(
                ApplicationView.from(application, detail.candidate().getFullName(), detail.job().getTitle(),
                        people.get(application.getAssignedToUserId())),
                CandidateView.from(detail.candidate()),
                JobOpeningView.from(detail.job()),
                detail.interviewList().stream()
                        .map(interview -> InterviewView.from(interview, people.get(interview.getInterviewerUserId())))
                        .toList());
    }

    public List<InterviewView> interviews(UUID organizationId, List<Interview> found) {
        if (found.isEmpty()) {
            return List.of();
        }
        Map<UUID, String> people = names(organizationId, found.stream().map(Interview::getInterviewerUserId).toList());
        return found.stream().map(interview -> InterviewView.from(interview, people.get(interview.getInterviewerUserId()))).toList();
    }

    public InterviewView interview(UUID organizationId, Interview found) {
        return interviews(organizationId, List.of(found)).get(0);
    }

    private Map<UUID, String> names(UUID organizationId, List<UUID> userIds) {
        List<UUID> ids = userIds.stream().filter(Objects::nonNull).distinct().toList();
        Map<UUID, String> names = new HashMap<>();
        if (!ids.isEmpty()) {
            users.findAll(organizationId, ids).forEach((id, user) -> names.put(id, user.fullName()));
        }
        return names;
    }
}
