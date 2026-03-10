from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware # 👈 1. 匯入 CORS
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any # 👈 加上 Dict, Any
from fastapi import Response
import uvicorn
import json
import logging
import datetime
import uuid

# Configure logging for Cloud Run
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("myinvois-service")

app = FastAPI(title="Bilboleh LHDN Microservice", version="1.0.0")

# 👈 2. 加入 CORS Middleware (非常重要，否則 React 無法連線)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開發階段允許所有來源 (localhost:5173 等)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class InvoiceItem(BaseModel):
    description: str
    quantity: float
    unit_price: float
    tax_type: str = "01"  # Default to Sales Tax
    tax_rate: float = 0.06

class InvoiceRequest(BaseModel):
    seller_tin: str = Field(..., example="C123456780")
    seller_brn: str = Field(..., example="202101012345")
    buyer_tin: str = Field(..., example="C876543210")
    buyer_brn: str = Field(..., example="202202025432")
    items: List[InvoiceItem]
    currency: str = "MYR"

# --- Core Logic ---
def sign_document(payload: dict) -> str:
    """
    PLACEHOLDER: Digital Signature (PKI) Implementation.
    """
    logger.info("Signing document with Digital Signature...")
    return "MOCK_DIGITAL_SIGNATURE_" + str(uuid.uuid4())

def map_to_lhdn_schema(data: InvoiceRequest) -> dict:
    # (保留你原本完美的 Schema 對接邏輯)
    issue_date = datetime.date.today().isoformat()
    issue_time = datetime.datetime.now().strftime("%H:%M:%SZ")
    total_tax = sum(item.quantity * item.unit_price * item.tax_rate for item in data.items)
    total_exclusive = sum(item.quantity * item.unit_price for item in data.items)
    
    payload = {
        "ID": f"INV-{uuid.uuid4().hex[:8].upper()}",
        "IssueDate": issue_date,
        "IssueTime": issue_time,
        "InvoiceTypeCode": "01",
        "DocumentCurrencyCode": data.currency,
        "TaxTotal": [{"TaxAmount": {"currencyID": data.currency, "value": total_tax}}],
        "LegalMonetaryTotal": {
            "PayableAmount": {"currencyID": data.currency, "value": total_exclusive + total_tax}
        }
    }
    return payload

# --- Routes ---

# 👈 3. 新增這個路由：專門給 React 前端 "Merchant Auto-Sync" 使用
@app.post("/api/v1/submit")
async def react_frontend_submit(payload: Dict[str, Any]):
    """
    接收從 React 前端 (Gemini AI 提取的資料) 傳來的動態 JSON。
    """
    # 可以在 Terminal 看到前端傳來的資料
    invoice_no = payload.get("invoiceNumber", "Unknown")
    buyer_name = payload.get("buyer", {}).get("name", "Unknown")
    total_amount = payload.get("totalPayable", 0)

    logger.info(f"✨ [REACT SYNC] Received Invoice: {invoice_no} | Buyer: {buyer_name} | Total: RM {total_amount}")
    
    # 加上數位簽章
    signature = sign_document(payload)
    payload["Signature"] = signature
    
    # 回傳給 React 前端，讓前端狀態變成 Validated
    return {
        "status": "success",
        "message": "Successfully synchronized with Bilboleh React App.",
        "lhdn_signature": signature,
        "received_data": payload
    }

# 👇 下面保留你原本寫好的所有路由 👇

@app.post("/api/v1/invoice/submit")
async def submit_invoice(request: InvoiceRequest):
    logger.info(f"Received invoice request for Seller TIN: {request.seller_tin}")
    lhdn_payload = map_to_lhdn_schema(request)
    signature = sign_document(lhdn_payload)
    lhdn_payload["Signature"] = signature
    
    mock_lhdn_response = {
        "submissionId": str(uuid.uuid4()),
        "acceptedDocuments": [{"uuid": str(uuid.uuid4()), "invoiceNumber": lhdn_payload["ID"]}]
    }
    logger.info(f"Invoice {lhdn_payload['ID']} successfully validated and archived.")
    qr_content = f"https://sdk.myinvois.hasil.gov.my/uuid/{mock_lhdn_response['acceptedDocuments'][0]['uuid']}"
    
    return {
        "status": "success",
        "lhdn_response": mock_lhdn_response,
        "visual_data": {"qr_url": qr_content, "pdf_status": "Generated"},
        "payload_sent": lhdn_payload
    }

@app.post("/api/download-invoice")
async def download_invoice_json():
    extracted_data = {
        "vendor_info": {"name": "lin hup hin", "tin": "N/A"},
        "financials": {"tax_amount": 300, "total_amount": 3000}
    }
    json_string = json.dumps(extracted_data, indent=4)
    return Response(
        content=json_string,
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="invoice_data.json"'}
    )

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) # 👈 建議改成 port=8000，配合前端設定