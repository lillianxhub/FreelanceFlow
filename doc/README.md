# ดัชนีกฎและแนวทาง implementation

ใช้เอกสารนี้นำทางสำหรับทุกการเปลี่ยนแปลงใน FreelanceFlow คำว่า **ต้อง/ห้าม** เป็นกฎ review; **ควร** เป็นแนวทางที่เลือกต่างได้โดยบอกเหตุผลใน PR หลักการเหล่านี้เป็นมาตรฐานเป้าหมาย ไม่ใช่คำรับรองว่าโค้ดเดิมปฏิบัติครบแล้ว

| เอกสาร | ใช้เมื่อ |
| --- | --- |
| [Feature workflow](feature-workflow.md) | เพิ่ม แก้ไข refactor หรือลบ feature |
| [Requirements](../REQUIREMENTS.md) | เขียน acceptance criteria และขอบเขต |
| [Backend](../code/Backend/README.md) | เปลี่ยน Spring Boot, transaction หรือ persistence |
| [Frontend](../code/Frontend/README.md) | เปลี่ยน Next.js, UI หรือ browser state |
| [API integration](../code/Frontend/docs/BACKEND_INTEGRATION.md) | เปลี่ยน request/response หรือ authentication |
| [SOLID](solid-analysis.md) / [Patterns](design-patterns.md) | แยก responsibilities และเลือก abstraction |
| [Error contract](error-contract.md) / [Reports](reports-summary-api.md) | เปลี่ยนสัญญา API |
| [Data dictionary](data-dictionary.md) | เพิ่ม/เปลี่ยน/เลิกใช้ schema |
| [Use cases](use-case-description.md) | ออกแบบ flow และ failure paths |
| [Diagrams](diagrams/README.md) | สื่อสารผลกระทบด้าน architecture/state/data |
| [Tests](../test/README.md) / [CI](ci-cd.md) | พิสูจน์พฤติกรรมและเตรียม PR |
| [Setup verification](../SETUP_VERIFICATION.md) | ตรวจ environment ใหม่ |
| [Development sequence](../SCHEDULE.md) | แบ่งงานและลำดับส่งมอบ |
| [References](references.md) | ตรวจเอกสารทางการและเวอร์ชัน |
| [PR template](../.github/pull_request_template.md) / [Feature removal](../.github/PULL_REQUEST_TEMPLATE/feature-removal-template.md) | บันทึก design, compatibility และผลตรวจสำหรับ review |

เมื่อ contract เปลี่ยน ต้องอัปเดตเฉพาะเอกสารที่เกี่ยวข้องพร้อม PR ห้ามเพิ่มจำนวน test หรือ claim coverage โดยไม่มีผลรันที่ผูกกับ commit/environment รายงานเก่าใน Git history และ JSON ใน `test/evidence/` เป็นหลักฐานประวัติ ไม่ใช่ผลปัจจุบัน
