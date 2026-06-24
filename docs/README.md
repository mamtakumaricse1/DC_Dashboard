# Tirap Performance Index — Documentation Index

| # | Document | For whom |
|---|----------|----------|
| 1 | [01_DC_User_Guide.md](./01_DC_User_Guide.md) | **DC briefing tomorrow** — features, daily use, demo script |
| 2 | [02_Technical_Flow.md](./02_Technical_Flow.md) | Developers / IT — APIs, JWT, bcrypt, PDF export flow |
| 3 | [03_District_Onboarding.md](./03_District_Onboarding.md) | New districts — database, config, users, go-live |
| 4 | [04_Local_Deployment_Without_Cloud.md](./04_Local_Deployment_Without_Cloud.md) | Run on laptop or office LAN without cloud hosting |
| 5 | [05_SRS_User_Department.md](./05_SRS_User_Department.md) | **Formal SRS** — user-department requirements for senior / IT sign-off |
| 5a | [SRS_Executive_Summary.docx](./SRS_Executive_Summary.docx) | **1-page executive summary (Word)** — for senior quick approval |
| 8 | [08_Letter_District_Administration_to_DIO_NIC.md](./08_Letter_District_Administration_to_DIO_NIC.md) | **Official letter** — District Administration to DIO NIC requesting software |
| 9 | [09_SRS_For_NIC_Implementation.md](./09_SRS_For_NIC_Implementation.md) | **SRS for NIC** — attachment to letter; implementation baseline |

### Word (.docx) versions

All guides are also available as Word documents in **`docs/docx/`**:

| Word file | From |
|-----------|------|
| `docx/01_DC_User_Guide.docx` | DC briefing guide |
| `docx/02_Technical_Flow.docx` | Technical flow |
| `docx/03_District_Onboarding.docx` | New district setup |
| `docx/04_Local_Deployment_Without_Cloud.docx` | Local / LAN deployment |
| `docx/05_SRS_User_Department.docx` | Full SRS |
| `docx/08_Letter_District_Administration_to_DIO_NIC.docx` | Letter to DIO NIC |
| `docx/09_SRS_For_NIC_Implementation.docx` | SRS for NIC (attachment) |
| `docx/00_Documentation_Index.docx` | This index |
| `SRS_Executive_Summary.docx` | 1-page executive summary |

**Regenerate all DOCX:**

```powershell
python D:\DistrictD\docs\md_to_docx.py
```

**Quick start**

```powershell
cd backend && node server.js
cd frontend && npm start
# http://localhost:3000/admindashboard
```
