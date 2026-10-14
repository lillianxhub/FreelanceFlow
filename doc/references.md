# แหล่งอ้างอิงสำหรับกฎพัฒนา

ตรวจเอกสารและ source configuration วันที่ 11 ตุลาคม 2026 (Asia/Bangkok) กฎเฉพาะ FreelanceFlow เป็นนโยบาย repository ไม่ใช่คำกล่าวว่า framework บังคับทั้งหมด เมื่ออัปเกรดให้ตรวจ docs ของ version ที่ใช้งานและทดลองก่อนเปลี่ยนกฎ

| แหล่ง | ใช้ประกอบ |
| --- | --- |
| [Spring Boot 4 testing](https://docs.spring.io/spring-boot/4.0/reference/testing/index.html) | test support และการเลือก test layers |
| [Spring Boot DI](https://docs.spring.io/spring-boot/reference/using/spring-beans-and-dependency-injection.html) | constructor injection และ bean boundaries |
| [Spring transaction annotations](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html) | transaction proxy, self-invocation และ rollback design |
| [Next Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) | rendering boundary และ providers |
| [Next rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites) | `/api` proxy configuration |
| [Next testing](https://nextjs.org/docs/app/guides/testing) / [Playwright](https://nextjs.org/docs/app/guides/testing/playwright) | unit/E2E และ production browser testing |
| [Playwright best practices](https://playwright.dev/docs/best-practices) | user-visible behavior, isolation และ locators |
| [Martin: SRP](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) | reason to change |
| [Martin: Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) | dependency direction |

Design patterns อ้างอิง Gamma, Helm, Johnson, Vlissides. *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley, 1994. SOLID ใช้ร่วมกับ Martin. *Agile Software Development: Principles, Patterns, and Practices*. Prentice Hall, 2002. ตารางเลือกใช้ในคู่มือเป็นการประยุกต์กับ repository ไม่ใช่การคัดลอกหนังสือ

หลักฐาน implementation จริง: `code/Backend/pom.xml`, migrations, controllers/services/repositories, `code/Frontend/package-lock.json`, `src/app`, API services, test sources และ workflow YAML เอกสาร framework แบบ unversioned อาจเปลี่ยนภายหลัง จึงตรวจ version/source เสมอ
