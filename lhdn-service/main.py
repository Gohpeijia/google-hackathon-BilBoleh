from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from fastapi import Response
import uvicorn
import json
import logging
import datetime
import uuid

# Configure logging for Cloud Run
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("myinvois-service")

app = FastAPI(title="EzBill LHDN Microservice", version="1.0.0")

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
    In production, this would use a private key from Google Secret Manager
    to sign the SHA-256 hash of the document.
    """
    logger.info("Signing document with Digital Signature...")
    return "MOCK_DIGITAL_SIGNATURE_" + str(uuid.uuid4())

def map_to_lhdn_schema(data: InvoiceRequest) -> dict:
    """
    Maps raw transaction data to the official LHDN MyInvois JSON Schema.
    """
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
        "TaxTotal": [
            {
                "TaxAmount": {"currencyID": data.currency, "value": total_tax},
                "TaxSubtotal": [
                    {
                        "TaxableAmount": {"currencyID": data.currency, "value": total_exclusive},
                        "TaxAmount": {"currencyID": data.currency, "value": total_tax},
                        "TaxCategory": {"ID": "01"}
                    }
                ]
            }
        ],
        "LegalMonetaryTotal": {
            "LineExtensionAmount": {"currencyID": data.currency, "value": total_exclusive},
            "TaxExclusiveAmount": {"currencyID": data.currency, "value": total_exclusive},
            "TaxInclusiveAmount": {"currencyID": data.currency, "value": total_exclusive + total_tax},
            "PayableAmount": {"currencyID": data.currency, "value": total_exclusive + total_tax}
        },
        "InvoiceLine": [
            {
                "ID": str(i+1),
                "InvoicedQuantity": {"unitCode": "UNIT", "value": item.quantity},
                "LineExtensionAmount": {"currencyID": data.currency, "value": item.quantity * item.unit_price},
                "Item": {"Description": item.description},
                "Price": {"PriceAmount": {"currencyID": data.currency, "value": item.unit_price}}
            } for i, item in enumerate(data.items)
        ]
    }
    return payload

# --- Routes ---

@app.post("/api/v1/invoice/submit")
async def submit_invoice(request: InvoiceRequest):
    # 1. Creation & Validation (Pydantic handles basic validation)
    logger.info(f"Received invoice request for Seller TIN: {request.seller_tin}")
    
    # 2. Submission (Formatting)
    lhdn_payload = map_to_lhdn_schema(request)
    
    # 3. Signing (PKI)
    signature = sign_document(lhdn_payload)
    lhdn_payload["Signature"] = signature
    
    # 4. Validation (Mock LHDN Sandbox API Call)
    logger.info("Submitting to LHDN Sandbox API...")
    # Mocking a successful 202 Accepted response from LHDN
    mock_lhdn_response = {
        "submissionId": str(uuid.uuid4()),
        "acceptedDocuments": [
            {
                "uuid": str(uuid.uuid4()),
                "invoiceNumber": lhdn_payload["ID"]
            }
        ]
    }
    
    # 5. Notification & Storage
    logger.info(f"Invoice {lhdn_payload['ID']} successfully validated and archived.")
    
    # 6. Presentation (Mock PDF/QR Generation)
    qr_content = f"https://sdk.myinvois.hasil.gov.my/uuid/{mock_lhdn_response['acceptedDocuments'][0]['uuid']}"
    
    return {
        "status": "success",
        "lhdn_response": mock_lhdn_response,
        "visual_data": {
            "qr_url": qr_content,
            "pdf_status": "Generated"
        },
        "payload_sent": lhdn_payload
    }

@app.post("/api/download-invoice")
async def download_invoice_json():
    # 1. This is the placeholder data (Replace this with dynamic data later)
    extracted_data = {
        "vendor_info": {
            "name": "lin hup hin",
            "tin": "N/A"
        },
        "financials": {
            "tax_amount": 300,
            "total_amount": 3000
        }
    }
    
    # 2. Convert the Python dictionary to a formatted JSON string
    json_string = json.dumps(extracted_data, indent=4)
    
    # 3. Return a Response with the 'attachment' header
    return Response(
        content=json_string,
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="invoice_data.json"'
        }
    )

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)