package com.ssdcve.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.ssdcve.dto.response.CanonicalCredential;
import com.ssdcve.dto.response.SignedCredentialEnvelope;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Renders a printable certificate PDF from the signed credential
 * envelope. The PDF is a human-readable view of the verifiable
 * credential; the JSON envelope remains the authoritative artifact.
 * A QR code embeds the public verification URL so the certificate
 * can be checked by anyone without contacting the issuer.
 */
@Service
public class CertificatePdfService {

    private static final PDRectangle PAGE = PDRectangle.A4;

    private static final PDFont BOLD =
            new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

    private static final PDFont REGULAR =
            new PDType1Font(Standard14Fonts.FontName.HELVETICA);

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy")
                    .withZone(ZoneOffset.UTC);

    private final ObjectMapper objectMapper;

    public CertificatePdfService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public byte[] generate(
            byte[] envelopeBytes,
            String verificationUrl,
            byte[] documentBytes,
            String documentContentType)
            throws Exception {

        SignedCredentialEnvelope envelope =
                objectMapper.readValue(
                        envelopeBytes,
                        SignedCredentialEnvelope.class
                );

        CanonicalCredential credential =
                envelope.credential();

        try (PDDocument document = new PDDocument()) {

            PDPage page = new PDPage(PAGE);
            document.addPage(page);

            try (PDPageContentStream cs =
                         new PDPageContentStream(document, page)) {

                drawBorder(cs);
                drawBody(cs, credential);
                drawQr(cs, document, verificationUrl);
            }

            if (documentBytes != null
                    && documentBytes.length > 0) {

                appendDocument(
                        document,
                        documentBytes,
                        documentContentType
                );
            }

            ByteArrayOutputStream out =
                    new ByteArrayOutputStream();

            document.save(out);

            return out.toByteArray();
        }
    }

    /**
     * Composes the issuer-uploaded original certificate into the
     * certificate PDF: PDFs are appended page-by-page, images are
     * scaled to fit a fresh page.
     */
    private void appendDocument(
            PDDocument document,
            byte[] documentBytes,
            String contentType)
            throws Exception {

        if (MediaType.APPLICATION_PDF_VALUE.equals(contentType)) {

            try (PDDocument uploaded =
                         Loader.loadPDF(documentBytes)) {

                PDFMergerUtility merger = new PDFMergerUtility();
                merger.appendDocument(document, uploaded);
            }

            return;
        }

        PDImageXObject image =
                PDImageXObject.createFromByteArray(
                        document,
                        documentBytes,
                        "original-certificate"
                );

        PDPage imagePage = new PDPage(PAGE);
        document.addPage(imagePage);

        float maxWidth = PAGE.getWidth() - 100;
        float maxHeight = PAGE.getHeight() - 100;

        float scale = Math.min(
                maxWidth / image.getWidth(),
                maxHeight / image.getHeight()
        );

        float width = image.getWidth() * scale;
        float height = image.getHeight() * scale;

        try (PDPageContentStream cs =
                     new PDPageContentStream(
                             document,
                             imagePage
                     )) {

            cs.drawImage(
                    image,
                    (PAGE.getWidth() - width) / 2f,
                    (PAGE.getHeight() - height) / 2f,
                    width,
                    height
            );
        }
    }

    private void drawBorder(PDPageContentStream cs)
            throws Exception {

        cs.setStrokingColor(0.2f, 0.3f, 0.6f);
        cs.setLineWidth(2f);
        cs.addRect(30, 30, PAGE.getWidth() - 60,
                PAGE.getHeight() - 60);
        cs.stroke();

        cs.setLineWidth(0.75f);
        cs.addRect(38, 38, PAGE.getWidth() - 76,
                PAGE.getHeight() - 76);
        cs.stroke();
    }

    private void drawBody(
            PDPageContentStream cs,
            CanonicalCredential credential)
            throws Exception {

        float center = PAGE.getWidth() / 2f;

        cs.setNonStrokingColor(0.2f, 0.3f, 0.6f);
        drawCentered(cs, credential.issuer().name(),
                center, 690, 24, BOLD);

        cs.setNonStrokingColor(0.35f, 0.35f, 0.35f);
        drawCentered(cs, credential.type(), center, 650, 14, REGULAR);

        cs.setNonStrokingColor(0f, 0f, 0f);
        drawCentered(cs, "This certifies that", center, 580, 12, REGULAR);

        drawCentered(cs, credential.subject().name(),
                center, 540, 28, BOLD);

        drawCentered(cs, credential.title(), center, 500, 16, BOLD);

        float y = 460;
        for (Map.Entry<String, Object> claim
                : credential.claims().entrySet()) {

            drawCentered(cs, claim.getKey() + ": " + claim.getValue(),
                    center, y, 12, REGULAR);
            y -= 20;
        }

        cs.setNonStrokingColor(0.35f, 0.35f, 0.35f);
        drawCentered(cs, "Credential No. "
                        + credential.credentialNumber(),
                center, 120, 10, REGULAR);

        drawCentered(cs, "Issued on "
                        + DATE_FORMAT.format(credential.issuedAt()),
                center, 100, 10, REGULAR);
    }

    private void drawCentered(
            PDPageContentStream cs,
            String text,
            float centerX,
            float y,
            float size,
            PDFont font)
            throws Exception {

        cs.beginText();
        cs.setFont(font, size);
        float width = font.getStringWidth(text) / 1000f * size;
        cs.newLineAtOffset(centerX - width / 2f, y);
        cs.showText(text);
        cs.endText();
    }

    private void drawQr(
            PDPageContentStream cs,
            PDDocument document,
            String verificationUrl)
            throws Exception {

        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(
                verificationUrl,
                BarcodeFormat.QR_CODE,
                300,
                300
        );

        BufferedImage image =
                MatrixToImageWriter.toBufferedImage(matrix);

        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(image, "png", png);

        PDImageXObject qr =
                PDImageXObject.createFromByteArray(
                        document,
                        png.toByteArray(),
                        "verification-qr"
                );

        float size = 120;
        cs.drawImage(qr, 40, 40, size, size);
    }
}