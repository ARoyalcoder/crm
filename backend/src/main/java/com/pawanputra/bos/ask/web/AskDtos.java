package com.pawanputra.bos.ask.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AskDtos {

    public record AskRequest(
            @NotBlank(message = "Question cannot be blank")
            @Size(max = 500, message = "Question must not exceed 500 characters")
            String question
    ) {}

    private AskDtos() {}
}
