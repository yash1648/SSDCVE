# SSD-CVE: Literature Survey

**Source:** Draft_SSDCVE.docx, Chapter 2 (report chapter — mirrors the project report)

---

The digital transformation of education has increased the use of electronic certificates for employment, higher education, internships, and professional applications. However, traditional certificate verification methods are often dependent on physical documents, PDF files, centralized databases, and manual communication with educational institutions. This has created a need for secure, reliable, and efficient digital certificate verification systems.

The literature related to digital certificate verification can broadly be studied through blockchain-based verification, decentralized storage, Self-Sovereign Identity (SSI), Verifiable Credentials (VC), cryptographic verification, and privacy-preserving credential sharing.

## 2.1 Traditional Certificate Verification

Traditional academic certificate verification generally involves a certificate issued by an educational institution and later checked by an employer or another organization. Verification may require contacting the institution through email, telephone, or other administrative procedures.

Such approaches have several limitations:

- Verification can be time-consuming.
- Manual checking requires human intervention.
- Paper or PDF certificates can be forged or modified.
- Verification may depend on the availability of the issuing institution.
- Managing revoked or expired certificates can be difficult.
- Students may have to share complete documents even when only limited information is required.

Research on blockchain-based academic verification also identifies traditional verification as a major source of delay and vulnerability to certificate fraud.

## 2.2 Blockchain-Based Certificate Verification

Blockchain technology has been widely investigated for academic certificate verification because it provides a tamper-resistant and distributed record of information.

Rustemi et al. conducted a systematic literature review of blockchain-based academic certificate verification systems. Their study identified 34 relevant studies from 1,744 papers published between 2018 and 2022. The review highlighted major research areas such as blockchain platforms, smart contracts, security, transparency, and fraud prevention.

Blockchain-based systems generally follow this process:

```
Certificate → Hash → Blockchain → Verification
```

The certificate or its hash is recorded using blockchain technology. During verification, the submitted certificate is compared with the stored information. Any change in the original document can therefore be detected.

However, blockchain-based systems can introduce additional complexity, transaction costs, network dependencies, and scalability concerns. Therefore, blockchain is useful for some applications but is not necessarily required for every digital credential verification system.

## 2.3 Blockchain and IPFS-Based Approaches

Several certificate verification systems combine blockchain with the InterPlanetary File System (IPFS).

IPFS provides content-addressed storage, where a file is identified using a Content Identifier (CID). Instead of storing the complete certificate directly on the blockchain, the certificate can be stored in IPFS while a hash or reference is maintained on the blockchain.

Jaafar, Alsaad, and Al-Kabi proposed an educational certificate verification system using Ethereum blockchain and IPFS. Their implementation used Solidity smart contracts and IPFS for decentralized certificate storage. QR-code-based verification was also used to retrieve certificate information.

Similarly, recent academic certificate systems have combined Ethereum and IPFS to reduce on-chain storage requirements while maintaining tamper-resistant verification.

The major advantage of this approach is that it separates certificate storage from blockchain records. However, such systems still depend on blockchain infrastructure and may have limitations related to transaction cost, scalability, privacy, and implementation complexity.

## 2.4 Self-Sovereign Identity

Self-Sovereign Identity (SSI) is an identity model in which users have greater control over their digital identity and credentials.

Schardong and Custódio performed a systematic review and mapping of SSI research. Their work describes SSI as a user-centered identity model in which users maintain control over their data and can share information directly with service providers. The study also identifies privacy, identity management, cryptography, and decentralized technologies as important areas of SSI research.

SSI is particularly relevant to digital certificates because a student can act as the Holder of a credential received from an educational institution.

The basic model can be represented as:

- **Issuer:** Educational institution that issues the credential.
- **Holder:** Student who receives and controls the credential.
- **Verifier:** Employer or organization that verifies the credential.

SSI does not mean that the student becomes the original source of the certificate information. The educational institution remains the trusted issuer, while the student controls possession and sharing of the credential.

## 2.5 Verifiable Credentials

The W3C (World Wide Web Consortium) Verifiable Credentials Data Model provides a standardized approach for representing digitally verifiable credentials.

The model defines important roles such as Issuer, Holder, Subject, and Verifier. A credential can contain information about the subject, issuer, credential type, claims, and validity conditions. Cryptographic proofs can make credentials tamper-evident and allow their authenticity to be verified.

The VC model is especially relevant to SSD-CVE because it separates the responsibilities of the issuer, holder, and verifier.

The general flow is:

```
Issuer issues credential → Holder stores credential → Holder shares credential → Verifier verifies credential
```

The W3C specification also makes an important distinction between verification and truth of claims. Successful cryptographic verification shows that a credential is authentic and current according to its proof and status. The verifier must still decide whether it trusts the issuer and whether the claims satisfy its requirements.

This concept directly supports our project design, where the educational institution remains the trusted issuer.

## 2.6 Blockcerts

Blockcerts is an open standard for issuing and verifying blockchain-based official records, including academic credentials. It follows a recipient-centric approach and provides tools for creating, issuing, viewing, and verifying certificates.

Blockcerts focuses on:

- Recipient control
- Open standards
- Digital verification
- Blockchain-based records
- Certificate wallets
- Revocation and credential lifecycle
- Self-sovereign principles

Its design demonstrates that students can possess and manage their credentials rather than depending entirely on an institution whenever a certificate needs to be verified. Blockcerts also addresses lifecycle concerns such as revocation and key management.

However, Blockcerts is primarily designed around blockchain-based credentials, whereas our current SSD-CVE MVP does not use blockchain.

## 2.7 Cryptographic Verification

Cryptographic techniques play an important role in protecting digital certificates.

Two important techniques are:

**Hashing** — A cryptographic hash function generates a fixed-length value from the certificate data.

```
Certificate → SHA-256 → Hash
```

If the certificate data is modified, its hash value changes. Therefore, hashing can be used to detect unauthorized modification.

**Digital Signature** — A digital signature provides evidence that the credential was issued using the issuer's private key.

```
Credential → Hash → Digital Signature
```

During verification, the verifier uses the issuer's public key to verify the signature.

In SSD-CVE, SHA-256 is used for integrity checking and Ed25519 is used for digital signatures. This separates the two important security requirements: detecting modification and verifying the issuer's authenticity.

## 2.8 Selective Disclosure and Privacy

One important limitation of traditional certificates is that students often need to share the complete certificate even when only some information is required.

For example, an employer may only need to know:

```
Degree = B.Tech
Branch = Computer Engineering
University = XYZ
```

The employer may not need the student's complete personal information.

Research on selective disclosure studies methods that allow users to share only selected claims or attributes from a digital credential. A 2024 review in ICT Express discusses selective disclosure, anonymous credentials, Verifiable Credentials, and zero-knowledge proofs as important approaches for privacy-preserving digital credentials.

The W3C Verifiable Credentials specification also defines selective disclosure as the ability of a holder to make fine-grained decisions about what information is shared.

This is relevant to SSD-CVE because the project aims to give the student greater control over the information shared with a verifier. Selective disclosure itself is **future work** — the current MVP shares the full signed envelope.

## 2.9 Detailed Literature Review

| No. | Journal / Publication | Author Name | Paper / Work Title | Approaches / Techniques / Algorithms |
|-----|-----------------------|-------------|---------------------|---------------------------------------|
| 1 | IEEE Access | Avni Rustemi, Fisnik Dalipi, Vladimir Atanasovski, Aleksandar Risteski | A Systematic Literature Review on Blockchain-Based Systems for Academic Certificate Verification | Systematic literature review, PRISMA, blockchain, smart contracts, academic certificate verification, security and fraud prevention |
| 2 | Computer Science Review | Alexander Mühle, Andreas Grüner, Tatiana Gayvoronskaya, Christoph Meinel | A Survey on Essential Components of a Self-Sovereign Identity | SSI architecture, decentralized identity, identity management, blockchain-based identity |
| 3 | Al-Mustansiriyah Journal of Science | Rafah Amer Jaafar, Saad Najim Alsaad, Mohammed Naji Al-Kabi | Educational Certificate Verification System: Enhancing Security and Authenticity using Ethereum Blockchain and IPFS | Ethereum, Solidity smart contracts, IPFS, QR-code verification, decentralized storage |
| 4 | IEEE I-SMAC Conference | Authors of the HLFeCERT study | Hyperledger Fabric Blockchain Framework: Efficient Solution for Academic Certificate Decentralized Repository | Hyperledger Fabric, SHA-256, digital watermarking, permissioned blockchain, certificate verification |
| 5 | ICT Express | Authors of the review | Selective Disclosure in Digital Credentials: A Review | Selective disclosure, anonymous credentials, Verifiable Credentials, zero-knowledge proofs |
| 6 | IntechOpen | Daniel Chiș, Mihai Caramihai | Blockchain in Higher Education: A Secure Traceability Architecture for Degree Verification | Blockchain, degree verification, traceability, decentralized verification |
| 7 | Journal of Network and Computer Applications | Authors of the study | Decentralized Certificate Issuance and Verification System Using Ethereum Blockchain Technology | Ethereum, decentralized issuance, smart contracts, blockchain-based verification |
| 8 | IEEE Conference Publication | Authors of the study | Academic Certificate Verification using Blockchain Technology | Ethereum, IPFS, certificate hashing, off-chain storage, blockchain verification |
| 9 | World Journal of Advanced Research and Reviews | P. Kamakshi Thai, Srija Gummadavelli, Akshitha Pagidipalli, Abhiram Gulab | A Blockchain-Based Framework for Academic Certificate Verification Using IPFS | Ethereum, IPFS, Solidity smart contracts, React dApp, CID-based storage |

The above studies show that academic certificate verification research has largely focused on blockchain, smart contracts, IPFS, cryptographic hashing, decentralized identity, and digital credentials. The systematic review by Rustemi et al. is particularly useful because it consolidates a large body of academic certificate verification research rather than describing only one implementation.

The SSI and Verifiable Credential literature adds another important perspective: the problem is not only about detecting forged certificates. It is also about who controls the credential, how it is shared, what information is disclosed, and how the verifier establishes trust in the issuer.

## 2.10 Limitations of Existing Systems

From the reviewed literature, the following limitations can be identified:

1. **Dependence on Manual Verification** — Traditional systems require institutions or administrators to manually confirm certificates, resulting in delays and additional workload.
2. **Certificate Forgery and Modification** — Paper documents and ordinary digital files can be copied or modified. Without cryptographic protection, detecting such modifications can be difficult.
3. **Blockchain Complexity** — Blockchain-based systems provide tamper resistance but introduce additional infrastructure, smart contracts, wallets, transaction processing, and network dependencies.
4. **Scalability and Cost** — Public blockchain systems may involve transaction fees and increasing processing requirements as the number of certificates grows.
5. **Privacy Concerns** — Storing certificate information or identifiers on publicly accessible distributed systems may create privacy and data exposure concerns.
6. **Limited User Control** — Some systems concentrate mainly on institutional issuance and verification and provide less emphasis on how the student controls and shares credentials.
7. **Revocation and Expiry** — A certificate that was valid when issued may later be revoked or expire. Efficiently maintaining and checking the current status of credentials is therefore necessary.
8. **Interoperability** — Different certificate systems may use different data formats, storage methods, and verification mechanisms. Lack of common standards can make interoperability difficult.
9. **Over-Sharing of Information** — Traditional certificates generally require the complete document to be shared. This can expose information that is unnecessary for a particular verification purpose.

## 2.11 Research Gap

The literature indicates that existing systems have successfully addressed several parts of digital certificate verification, but there is still scope for combining these ideas into a practical and privacy-conscious system.

Blockchain-based solutions mainly focus on immutability and decentralized verification, while SSI and Verifiable Credential approaches focus more on holder control, credential sharing, privacy, and standardized roles.

The proposed SSD-CVE addresses this gap by combining these concepts in a single web-based system.

## 2.12 Relation of Literature Survey to Proposed SSD-CVE

Based on the reviewed literature, the proposed SSD-CVE adopts the following concepts:

| Literature Concept | SSD-CVE Implementation |
|--------------------|------------------------|
| Issuer–Holder–Verifier model | Issuer, Holder and Verifier roles |
| Self-Sovereign Identity | Holder controls credential storage and sharing |
| Cryptographic integrity | SHA-256 |
| Digital authenticity | Ed25519 digital signatures |
| Decentralized/content-addressed storage | Local IPFS |
| Credential metadata | PostgreSQL |
| Certificate lifecycle | Active, Revoked and Expired states |
| Credential identification | Unique Certificate ID |
| Privacy | Controlled sharing of credential information |
| Blockchain | Not used in current MVP |

The project therefore does not simply reproduce a blockchain certificate verification system. Instead, it uses the relevant ideas from SSI, Verifiable Credentials, cryptography, secure storage, and certificate lifecycle management and combines them into a practical certificate verification platform.

## 2.13 Summary of Literature Survey

The literature survey shows that digital certificate verification has evolved from manual and centralized methods toward cryptographic, decentralized, and user-controlled approaches. Blockchain and IPFS have been widely explored for tamper resistance and decentralized storage, while SSI and Verifiable Credentials provide concepts for holder control, issuer trust, and privacy.

Based on these findings, SSD-CVE focuses on secure issuance, holder-controlled sharing, cryptographic verification, certificate status management, and privacy-conscious storage. The current MVP uses SHA-256, Ed25519, PostgreSQL and local IPFS without requiring blockchain.

---

## Appendix: Weekly Progress Notes

### Week 1 — Introduction

**Current week:**
- Secure platform for digital certificate verification.
- Reduces manual work and detects certificate tampering.
- Gives students control over their digital credentials.

**Next week:**
- Studied traditional certificate verification.
- Reviewed blockchain-based verification.
- Studied certificate security issues.

### Week 2 — Literature Survey

**Current week:**
- Studied traditional certificate verification.
- Reviewed blockchain-based verification.
- Studied certificate security issues.

**Next Week:**
- Study IPFS-based systems.
- Review SSI concepts.
- Study Verifiable Credentials.

### Week 3 — Literature Survey

**Current week:**
- Studied blockchain and IPFS systems.
- Reviewed SSI and Verifiable Credentials.
- Studied hashing and digital signatures.

**Next Week:**
- Compare existing systems.
- Identify system limitations.
- Find the research gap.