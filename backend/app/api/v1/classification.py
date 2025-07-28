from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
import pandas as pd
import io
import os
import json
from pydantic import BaseModel
import openai
from app.core.config import settings

# Initialize OpenAI client
client = openai.OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_BASE_URL,
    timeout=60.0,
    max_retries=3
)

def get_class(article, candidate_labels, multi_label=False):
    """使用OpenAI LLM对文本进行分类"""
    try:
        # 创建分类提示词
        labels_str = ", ".join(candidate_labels)
        prompt = f"""请将以下文本分类到这些类别中的一个: {labels_str}
        
要分类的文本: {article}
        
请只返回一个JSON对象，格式如下:
        {{
            "label": "选择的类别",
            "score": 0到1之间的置信度分数
        }}
        
从提供的类别列表中选择最合适的类别。"""
        
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "你是一个文本分类助手。请始终返回有效的JSON格式。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=150
        )
        
        # 解析响应
        result_text = response.choices[0].message.content.strip()
        try:
            result = json.loads(result_text)
            return {
                "label": result.get("label", candidate_labels[0]),
                "score": float(result.get("score", 0.5))
            }
        except json.JSONDecodeError:
            # JSON解析失败时的回退
            return {
                "label": candidate_labels[0],
                "score": 0.5
            }
            
    except openai.APIConnectionError as e:
        print(f"API连接失败: {str(e)}")
        return {
            "label": candidate_labels[0] if candidate_labels else "unknown",
            "score": 0.0
        }
    except openai.APITimeoutError as e:
        print(f"API请求超时: {str(e)}")
        return {
            "label": candidate_labels[0] if candidate_labels else "unknown",
            "score": 0.0
        }
    except Exception as e:
        print(f"分类失败: {str(e)}")
        return {
            "label": candidate_labels[0] if candidate_labels else "unknown",
            "score": 0.0
        }

router = APIRouter()


class ClassifyTextRequest(BaseModel):
    text: str
    labels: List[str]


class ClassifyTextLLMRequest(BaseModel):
    text: str
    candidate_labels: List[str]
    multi_label: Optional[bool] = False


class ClassificationResult(BaseModel):
    text: str
    predicted_labels: List[str]
    confidence: float


class LLMClassificationResult(BaseModel):
    text: str
    label: str
    score: float
    candidate_labels: List[str]


class ExtractInfoRequest(BaseModel):
    text: str


class ExtractInfoResult(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


def extract_penalty_info(text):
    """使用LLM提取行政处罚决定书关键信息"""
    try:
        # 构建提示词
        prompt = f"""你是一个文本信息抽取模型。
请从以下文本中提取以下关键信息，并以 JSON 格式输出：
  "行政处罚决定书文号",
  "被处罚当事人",
  "主要违法违规事实",
  "行政处罚依据"（以字符串形式输出所有相关条文，多个条文用分号分隔）,
  "行政处罚决定",
  "作出处罚决定的机关名称",
  "作出处罚决定的日期",
  "行业",
  "罚没总金额"（必须转换为纯数字形式，包含罚款金额和没收金额的总和，单位为元。例如：10万元 → 100000，5.5万元 → 55000，1000元 → 1000。如果包含多项金额，请计算总和。如果无法确定具体数字，填写0）,
  "违规类型",
  "监管地区" （相关省份）.
重要提示：将输出格式化为JSON。只返回JSON响应，不添加其他评论或文本。如果返回的文本不是JSON，将视为失败。所有字段值都必须是字符串类型，不要使用数组或列表格式。

输入文本：{text}"""
        
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "你是一个专业的文本信息抽取助手。请严格按照要求以JSON格式返回结果。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1500
        )
        
        # 解析响应
        result_text = response.choices[0].message.content.strip()
        try:
            # 尝试解析JSON
            result = json.loads(result_text)
            return {
                "success": True,
                "data": result
            }
        except json.JSONDecodeError:
            # 如果JSON解析失败，尝试提取JSON部分
            import re
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group())
                    return {
                        "success": True,
                        "data": result
                    }
                except json.JSONDecodeError:
                    pass
            
            return {
                "success": False,
                "error": "无法解析LLM返回的JSON格式",
                "raw_response": result_text
            }
            
    except openai.APIConnectionError as e:
        return {
            "success": False,
            "error": f"API连接失败: {str(e)}. 请检查网络连接或API配置"
        }
    except openai.APITimeoutError as e:
        return {
            "success": False,
            "error": f"API请求超时: {str(e)}. 网络可能较慢"
        }
    except openai.RateLimitError as e:
        return {
            "success": False,
            "error": f"API限流: {str(e)}. 请稍后重试"
        }
    except openai.AuthenticationError as e:
        return {
            "success": False,
            "error": f"API认证失败: {str(e)}. 请检查API密钥"
        }
    except Exception as e:
        return {
             "success": False,
             "error": f"LLM分析失败: {str(e)}"
         }


@router.post("/extract-penalty-info", response_model=ExtractInfoResult)
async def extract_penalty_info_endpoint(request: ExtractInfoRequest):
    """提取行政处罚决定书关键信息"""
    try:
        result = extract_penalty_info(request.text)
        return ExtractInfoResult(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"信息提取失败: {str(e)}")


@router.post("/classify-text-llm")
async def classify_text_llm(request: ClassifyTextLLMRequest):
    """使用LLM对文本进行分类，输入文本和候选标签，输出JSON格式的分类结果"""
    try:
        # 调用classifier.py中的get_class函数
        result = get_class(
            article=request.text,
            candidate_labels=request.candidate_labels,
            multi_label=request.multi_label
        )
        
        return {
            "text": request.text,
            "label": result["label"],
            "score": result["score"],
            "candidate_labels": request.candidate_labels,
            "multi_label": request.multi_label
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分类失败: {str(e)}")


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