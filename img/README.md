# กฎใช้ภาพและสื่อในการพัฒนา

เก็บ screenshot/illustration ที่อธิบาย feature หรือ evidence จริง ระบุ flow, commit และ viewport ในคำอธิบายเมื่อใช้ตรวจ acceptance criteria ภาพ technical diagram ที่แก้ได้ควรอยู่ใน `doc/diagrams/`

ใช้ test users/data และไม่เผย secrets หรือข้อมูลส่วนตัว เก็บ source/license/credit ของ assets ลดไฟล์ซ้ำ และไม่สร้าง screenshot เป็นหลักฐานผ่านแทน automated/manual result

เมื่อเพิ่ม/แก้/ลบ feature ให้ปรับรูปที่ docs อ้างอิงและตรวจลิงก์ก่อนลบไฟล์ อย่าลบ assets ที่ยังมี code consumer
