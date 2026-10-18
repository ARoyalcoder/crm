package com.pawanputra.bos.platform.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.cloudinary.Url;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CloudinaryObjectStorageTest {

    private Cloudinary cloudinary;
    private Uploader uploader;
    private CloudinaryObjectStorage storage;

    @BeforeEach
    void setUp() {
        cloudinary = mock(Cloudinary.class);
        uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        storage = new CloudinaryObjectStorage(cloudinary, "instagram-news");
    }

    @Test
    void putUploadsWithFolderPrefix() throws Exception {
        byte[] bytes = "sample-content".getBytes(StandardCharsets.UTF_8);
        when(uploader.upload(any(byte[].class), anyMap()))
                .thenReturn(Map.of("secure_url", "https://res.cloudinary.com/test/auto/upload/instagram-news/docs/1.pdf"));

        storage.put("docs/1.pdf", new ByteArrayInputStream(bytes), bytes.length, "application/pdf");

        verify(uploader).upload(eq(bytes), anyMap());
    }

    @Test
    void presignedDownloadUrlGeneratesValidUri() {
        Url url = mock(Url.class);
        when(cloudinary.url()).thenReturn(url);
        when(url.secure(true)).thenReturn(url);
        when(url.resourceType("raw")).thenReturn(url);
        when(url.generate("instagram-news/docs/contract.pdf"))
                .thenReturn("https://res.cloudinary.com/dcdv6yqq7/raw/upload/instagram-news/docs/contract.pdf");

        URI result = storage.presignedDownloadUrl("docs/contract.pdf", Duration.ofMinutes(15));

        assertThat(result)
                .isEqualTo(URI.create("https://res.cloudinary.com/dcdv6yqq7/raw/upload/instagram-news/docs/contract.pdf"));
    }

    @Test
    void deleteCallsDestroy() throws Exception {
        when(uploader.destroy(eq("instagram-news/docs/test.pdf"), anyMap()))
                .thenReturn(Map.of("result", "ok"));

        storage.delete("docs/test.pdf");

        verify(uploader).destroy(eq("instagram-news/docs/test.pdf"), anyMap());
    }
}
