package com.pawanputra.bos.brief.internal;

import com.pawanputra.bos.brief.api.BriefRole;
import java.time.LocalDate;
import java.util.List;

public record BriefResponse(BriefRole role, String greeting, List<BriefSection> sections, LocalDate date) {}
