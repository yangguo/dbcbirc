from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List
import pandas as pd
import io
from pydantic import BaseModel

router = APIRouter()


class ClassifyTextRequest(BaseModel):
    text: str
    labels: List[str]


class ClassificationResult(BaseModel):
    text: str
    predicted_labels: List[str]
    confidence: float


@router.post("/classify-text")
async def classify_text(request: ClassifyTextRequest):
    """Classify a single text input"""
    try:
        # This is a placeholder implementation
        # In a real scenario, you would use an AI model for classification
        
        # Simple keyword-based classification for demonstration
        text_lower = request.text.lower()
        predicted_labels = []
        confidence = 0.0
        
        # Basic keyword matching
        keyword_mapping = {
            "违规放贷": ["放贷", "贷款", "信贷"],
            "内控管理": ["内控", "管理", "制度"],
            "反洗钱": ["洗钱", "反洗钱", "可疑交易"],
            "消费者权益": ["消费者", "权益", "投诉"],
            "信息披露": ["披露", "信息", "公开"],
            "风险管理": ["风险", "管理", "控制"]
        }
        
        for label in request.labels:
            if label in keyword_mapping:
                keywords = keyword_mapping[label]
                if any(keyword in text_lower for keyword in keywords):
                    predicted_labels.append(label)
                    confidence += 0.8
        
        if not predicted_labels:
            # Default to first label if no matches
            predicted_labels = [request.labels[0]] if request.labels else ["其他"]
            confidence = 0.3
        
        confidence = min(confidence / len(predicted_labels), 1.0) if predicted_labels else 0.0
        
        return {
            "text": request.text,
            "predicted_labels": predicted_labels,
            "confidence": round(confidence, 2)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-classify")
async def batch_classify(
    file: UploadFile = File(...),
    labels: str = Form(...)
):
    """Batch classify cases from uploaded CSV file"""
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Parse labels
        label_list = [label.strip() for label in labels.split(',')]
        
        # Check if required columns exist
        if 'content' not in df.columns and 'text' not in df.columns:
            raise HTTPException(status_code=400, detail="CSV must contain 'content' or 'text' column")
        
        text_column = 'content' if 'content' in df.columns else 'text'
        
        # Classify each row
        results = []
        for index, row in df.iterrows():
            text = str(row[text_column])
            
            # Simple classification logic (same as single text classification)
            text_lower = text.lower()
            predicted_labels = []
            confidence = 0.0
            
            keyword_mapping = {
                "违规放贷": ["放贷", "贷款", "信贷"],
                "内控管理": ["内控", "管理", "制度"],
                "反洗钱": ["洗钱", "反洗钱", "可疑交易"],
                "消费者权益": ["消费者", "权益", "投诉"],
                "信息披露": ["披露", "信息", "公开"],
                "风险管理": ["风险", "管理", "控制"]
            }
            
            for label in label_list:
                if label in keyword_mapping:
                    keywords = keyword_mapping[label]
                    if any(keyword in text_lower for keyword in keywords):
                        predicted_labels.append(label)
                        confidence += 0.8
            
            if not predicted_labels:
                predicted_labels = [label_list[0]] if label_list else ["其他"]
                confidence = 0.3
            
            confidence = min(confidence / len(predicted_labels), 1.0) if predicted_labels else 0.0
            
            # Add results to original row
            result_row = row.to_dict()
            result_row['predicted_labels'] = ','.join(predicted_labels)
            result_row['confidence'] = round(confidence, 2)
            results.append(result_row)
        
        # Convert results to CSV
        result_df = pd.DataFrame(results)
        csv_buffer = io.StringIO()
        result_df.to_csv(csv_buffer, index=False, encoding='utf-8-sig')
        csv_data = csv_buffer.getvalue()
        
        return {
            "message": "Batch classification completed",
            "processed_count": len(results),
            "csv_data": csv_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))