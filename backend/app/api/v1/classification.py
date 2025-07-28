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
    timeout=120.0,  # Increased timeout to 2 minutes
    max_retries=5   # Increased retries
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
    data: Optional[List[dict]] = None
    error: Optional[str] = None


def extract_penalty_info_fallback(text):
    """基本的文本解析作为LLM失败时的fallback"""
    try:
        import re
        
        # 尝试从文本中提取基本信息
        results = []
        
        # 简单的正则表达式匹配
        # 查找公司名称模式
        company_pattern = r'([^0-9\s]+(?:保险|银行|信托|证券|基金|金融)(?:股份有限公司|有限公司|公司))'
        companies = re.findall(company_pattern, text)
        
        # 查找金额模式
        amount_pattern = r'(\d+(?:\.\d+)?万元)'
        amounts = re.findall(amount_pattern, text)
        
        # 查找监管机关
        regulator_pattern = r'(金融监管总局|银保监[局会]|人民银行)'
        regulators = re.findall(regulator_pattern, text)
        
        # 如果找到了公司，为每个公司创建一个记录
        if companies:
            for i, company in enumerate(companies):
                amount_str = "0"
                if i < len(amounts):
                    # 转换金额格式
                    amount_text = amounts[i]
                    if '万元' in amount_text:
                        amount_num = float(amount_text.replace('万元', ''))
                        amount_str = str(int(amount_num * 10000))
                
                regulator = regulators[0] if regulators else "金融监管总局"
                
                results.append({
                    "行政处罚决定书文号": "",
                    "被处罚当事人": company,
                    "主要违法违规事实": "基本解析模式，详细信息需要LLM处理",
                    "行政处罚依据": "《保险法》等相关规定",
                    "行政处罚决定": "详细处罚内容需要LLM处理",
                    "作出处罚决定的机关名称": regulator,
                    "作出处罚决定的日期": "",
                    "行业": "保险业" if "保险" in company else "金融业",
                    "罚没总金额": amount_str,
                    "违规类型": "需要LLM分析",
                    "监管地区": ""
                })
        
        if not results:
            # 如果没有找到任何信息，返回一个基本结构
            results = [{
                "行政处罚决定书文号": "",
                "被处罚当事人": "解析失败",
                "主要违法违规事实": "基本解析模式无法提取详细信息",
                "行政处罚依据": "",
                "行政处罚决定": "",
                "作出处罚决定的机关名称": "",
                "作出处罚决定的日期": "",
                "行业": "",
                "罚没总金额": "0",
                "违规类型": "",
                "监管地区": ""
            }]
        
        return {
            "success": True,
            "data": results,
            "fallback_mode": True
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"基本解析也失败: {str(e)}"
        }


def extract_penalty_info(text):
    """使用LLM提取行政处罚决定书关键信息"""
    try:
        # 检查API密钥是否配置
        if not settings.OPENAI_API_KEY:
            print("API密钥未配置，使用fallback模式")
            return extract_penalty_info_fallback(text)
        
        # 检查输入文本是否为空
        if not text or not text.strip():
            return {
                "success": False,
                "error": "输入文本为空"
            }
        # 构建提示词
        prompt = f"""你是一个专业的文本信息抽取模型。请从输入的表格数据中提取行政处罚信息。

输入文本包含表格格式的行政处罚数据，可能包含以下列：序号、当事人名称、机构地址、主要违法违规行为、行政处罚内容、作出决定机关等。

请为每个处罚记录提取以下信息，并严格按照JSON数组格式输出：

[
  {{
    "行政处罚决定书文号": "文号信息（如果没有明确文号，填写空字符串）",
    "被处罚当事人": "当事人名称",
    "主要违法违规事实": "违法违规行为描述",
    "行政处罚依据": "法律依据（如《保险法》等）",
    "行政处罚决定": "具体处罚内容",
    "作出处罚决定的机关名称": "决定机关",
    "作出处罚决定的日期": "日期（如果没有明确日期，填写空字符串）",
    "行业": "所属行业（如保险业、银行业等）",
    "罚没总金额": "数字形式的金额（单位：元，如253万元转换为2530000，如无法确定填写0）",
    "违规类型": "违规类型分类",
    "监管地区": "相关地区或省份"
  }}
]

处理要求：
1. 仔细分析表格结构，识别每个完整的处罚记录
2. 所有字段值必须是字符串类型
3. 金额字段需要转换为纯数字字符串（如"2530000"）
4. 只返回JSON数组，不要添加任何解释文字
5. 确保JSON格式正确，可以被解析

输入数据：
{text}"""
        
        # Add retry logic with exponential backoff
        import time
        max_retries = 3
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                response = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": "你是一个专业的文本信息抽取助手。你必须严格按照要求返回有效的JSON数组格式，不要添加任何markdown标记、解释文字或其他内容。确保返回的内容可以直接被json.loads()解析。"},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=2000,
                    timeout=90.0  # Per-request timeout
                )
                break  # Success, exit retry loop
            except (openai.APITimeoutError, openai.APIConnectionError) as e:
                if attempt == max_retries - 1:  # Last attempt
                    raise e
                delay = base_delay * (2 ** attempt)  # Exponential backoff
                print(f"API调用失败 (尝试 {attempt + 1}/{max_retries}), {delay}秒后重试: {str(e)}")
                time.sleep(delay)
        
        # 解析响应
        result_text = response.choices[0].message.content.strip()
        
        # 清理响应文本，移除可能的markdown代码块标记
        if result_text.startswith('```json'):
            result_text = result_text[7:]
        if result_text.startswith('```'):
            result_text = result_text[3:]
        if result_text.endswith('```'):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        try:
            # 尝试直接解析JSON
            result = json.loads(result_text)
            # 确保结果是列表格式
            if not isinstance(result, list):
                result = [result]  # 如果不是列表，转换为单元素列表
            return {
                "success": True,
                "data": result
            }
        except json.JSONDecodeError:
            # 如果JSON解析失败，尝试提取JSON数组部分
            import re
            
            # 首先尝试匹配完整的JSON数组（支持嵌套）
            json_array_pattern = r'\[(?:[^[\]]*|\[[^\]]*\])*\]'
            json_array_match = re.search(json_array_pattern, result_text, re.DOTALL)
            if json_array_match:
                try:
                    result = json.loads(json_array_match.group())
                    if isinstance(result, list):
                        return {
                            "success": True,
                            "data": result
                        }
                except json.JSONDecodeError:
                    pass
            
            # 如果数组匹配失败，尝试匹配单个JSON对象
            json_object_pattern = r'\{(?:[^{}]*|\{[^}]*\})*\}'
            json_matches = re.findall(json_object_pattern, result_text, re.DOTALL)
            if json_matches:
                try:
                    results = []
                    for match in json_matches:
                        obj = json.loads(match)
                        results.append(obj)
                    return {
                        "success": True,
                        "data": results
                    }
                except json.JSONDecodeError:
                    pass
            
            # 最后尝试：查找所有可能的JSON片段并尝试修复
            try:
                # 尝试修复常见的JSON格式问题
                fixed_text = result_text
                # 修复可能的尾随逗号
                fixed_text = re.sub(r',\s*}', '}', fixed_text)
                fixed_text = re.sub(r',\s*]', ']', fixed_text)
                
                result = json.loads(fixed_text)
                if not isinstance(result, list):
                    result = [result]
                return {
                    "success": True,
                    "data": result
                }
            except json.JSONDecodeError:
                pass
            
            # 如果所有JSON解析都失败，返回一个基本的结果结构
            print(f"JSON解析完全失败，原始响应: {result_text[:200]}...")
            
            # 尝试从文本中提取基本信息作为fallback
            fallback_result = [{
                "行政处罚决定书文号": "",
                "被处罚当事人": "解析失败",
                "主要违法违规事实": "LLM响应格式错误，无法解析",
                "行政处罚依据": "",
                "行政处罚决定": "",
                "作出处罚决定的机关名称": "",
                "作出处罚决定的日期": "",
                "行业": "",
                "罚没总金额": "0",
                "违规类型": "",
                "监管地区": ""
            }]
            
            return {
                "success": False,
                "error": "无法解析LLM返回的JSON格式",
                "data": fallback_result,
                "raw_response": result_text[:500] + "..." if len(result_text) > 500 else result_text
            }
            
    except openai.APIConnectionError as e:
        print(f"API连接失败详情: {str(e)}, 使用fallback模式")
        fallback_result = extract_penalty_info_fallback(text)
        fallback_result["error"] = f"API连接失败，使用基本解析模式: {str(e)}"
        return fallback_result
    except openai.APITimeoutError as e:
        print(f"API请求超时详情: {str(e)}, 使用fallback模式")
        fallback_result = extract_penalty_info_fallback(text)
        fallback_result["error"] = f"API请求超时，使用基本解析模式: {str(e)}"
        return fallback_result
    except openai.RateLimitError as e:
        print(f"API限流详情: {str(e)}")
        return {
            "success": False,
            "error": f"API限流: {str(e)}. 请稍后重试"
        }
    except openai.AuthenticationError as e:
        print(f"API认证失败详情: {str(e)}")
        return {
            "success": False,
            "error": f"API认证失败: {str(e)}. 请检查API密钥"
        }
    except Exception as e:
        print(f"LLM分析失败详情: {str(e)}")
        print(f"输入文本长度: {len(text) if text else 0}")
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