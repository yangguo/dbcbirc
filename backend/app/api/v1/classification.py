from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import List, Optional
import pandas as pd
import io
import os
import json
from datetime import datetime, timedelta
from pydantic import BaseModel
import openai
from app.core.config import settings
import asyncio

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


class SaveSuccessfulRecordsRequest(BaseModel):
    results: List[dict]


@router.post("/save-successful-records")
async def save_successful_records(request: SaveSuccessfulRecordsRequest):
    """保存成功的记录到两个CSV文件"""
    try:
        # 过滤出成功的记录
        successful_records = [record for record in request.results if record.get("状态") == "成功"]
        
        if not successful_records:
            raise HTTPException(status_code=400, detail="没有成功的记录可以保存")
        
        # 生成时间戳
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 获取项目根目录下的cbirc文件夹路径
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
        cbirc_dir = os.path.join(project_root, "cbirc")
        
        # 确保cbirc目录存在
        os.makedirs(cbirc_dir, exist_ok=True)
        
        # 准备第一个文件的数据 (cbircsplit)
        split_data = []
        for record in successful_records:
            split_record = {
                "wenhao": record.get("行政处罚决定书文号", ""),
                "people": record.get("被处罚当事人", ""),
                "event": record.get("主要违法违规事实", ""),
                "law": record.get("行政处罚依据", ""),
                "penalty": record.get("行政处罚决定", ""),
                "org": record.get("作出处罚决定的机关名称", ""),
                "date": record.get("作出处罚决定的日期", ""),
                "id": record.get("原始ID", "")
            }
            split_data.append(split_record)
        
        # 准备第二个文件的数据 (cbirccat)
        cat_data = []
        for record in successful_records:
            cat_record = {
                "id": record.get("原始ID", ""),
                "amount": record.get("罚没总金额", ""),
                "industry": record.get("行业", ""),
                "category": record.get("违规类型", ""),
                "province": record.get("监管地区", "")
            }
            cat_data.append(cat_record)
        
        # 保存第一个文件
        split_filename = f"cbircsplit{timestamp}.csv"
        split_filepath = os.path.join(cbirc_dir, split_filename)
        split_df = pd.DataFrame(split_data)
        split_df.to_csv(split_filepath, index=False, encoding='utf-8-sig')
        
        # 保存第二个文件
        cat_filename = f"cbirccat{timestamp}.csv"
        cat_filepath = os.path.join(cbirc_dir, cat_filename)
        cat_df = pd.DataFrame(cat_data)
        cat_df.to_csv(cat_filepath, index=False, encoding='utf-8-sig')
        
        return {
            "message": "成功记录已保存",
            "successful_count": len(successful_records),
            "files_created": [
                {
                    "filename": split_filename,
                    "filepath": split_filepath,
                    "records": len(split_data)
                },
                {
                    "filename": cat_filename,
                    "filepath": cat_filepath,
                    "records": len(cat_data)
                }
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存文件失败: {str(e)}")


@router.post("/batch-extract-penalty-info")
async def batch_extract_penalty_info(
    file: UploadFile = File(...),
    id_column: str = Form("id"),
    content_column: str = Form("content")
):
    """批量处罚信息提取"""
    import time
    from datetime import datetime, timedelta
    
    start_time = time.time()
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        # 验证文件类型
        if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
            raise HTTPException(status_code=400, detail="只支持CSV和Excel文件")
        
        # 读取文件
        file_read_start = time.time()
        contents = await file.read()
        file_size_mb = len(contents) / (1024 * 1024)
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        file_read_time = time.time() - file_read_start
        
        # 检查必需的列是否存在
        if id_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"文件中不存在列: {id_column}")
        if content_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"文件中不存在列: {content_column}")
        
        # 初始化日志和统计信息
        results = []
        processing_logs = []
        success_count = 0
        failure_count = 0
        total_extracted_records = 0
        
        # 估算完成时间（基于历史平均处理时间，假设每条记录平均3秒）
        estimated_time_per_record = 3.0
        estimated_total_time = len(df) * estimated_time_per_record
        estimated_completion = datetime.now() + timedelta(seconds=estimated_total_time)
        
        # 记录开始信息
        start_log = f"[{current_time}] 开始批量处罚信息提取任务"
        file_info_log = f"文件信息: {file.filename} (大小: {file_size_mb:.2f}MB, 读取耗时: {file_read_time:.2f}秒)"
        task_info_log = f"任务信息: 总记录数={len(df)}, ID列='{id_column}', 内容列='{content_column}'"
        estimate_log = f"预估完成时间: {estimated_completion.strftime('%Y-%m-%d %H:%M:%S')} (预计耗时: {estimated_total_time/60:.1f}分钟)"
        
        print(start_log)
        print(file_info_log)
        print(task_info_log)
        print(estimate_log)
        
        processing_logs.extend([start_log, file_info_log, task_info_log, estimate_log])
        
        # 创建临时文件目录
        # 使用项目根目录的绝对路径，而不是相对于backend目录的路径
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        temp_dir = os.path.join(project_root, settings.DATA_FOLDER, "temp")
        os.makedirs(temp_dir, exist_ok=True)
        
        # 批量提取处罚信息
        for index, row in df.iterrows():
            record_start_time = time.time()
            record_id = str(row[id_column])
            text = str(row[content_column])
            text_length = len(text)
            
            # 计算进度和剩余时间
            progress_percent = ((index + 1) / len(df)) * 100
            if index > 0:
                avg_time_per_record = (time.time() - start_time) / (index + 1)
                remaining_records = len(df) - (index + 1)
                estimated_remaining_time = remaining_records * avg_time_per_record
                estimated_finish = datetime.now() + timedelta(seconds=estimated_remaining_time)
                time_info = f"预计剩余时间: {estimated_remaining_time/60:.1f}分钟, 预计完成: {estimated_finish.strftime('%H:%M:%S')}"
            else:
                time_info = "计算剩余时间中..."
            
            progress_log = f"[{datetime.now().strftime('%H:%M:%S')}] 处理进度: {index + 1}/{len(df)} ({progress_percent:.1f}%) - ID: {record_id}"
            input_log = f"输入信息: 文本长度={text_length}字符, {time_info}"
            
            print(progress_log)
            print(input_log)
            processing_logs.append(progress_log)
            processing_logs.append(input_log)
            
            # 记录输入文本的前100个字符用于调试
            if text_length > 0:
                text_preview = text[:100] + "..." if len(text) > 100 else text
                preview_log = f"输入文本预览: {text_preview}"
                processing_logs.append(preview_log)
            
            # 调用处罚信息提取函数
            extract_result = extract_penalty_info(text)
            record_process_time = time.time() - record_start_time
            
            if extract_result["success"] and extract_result["data"]:
                # 为每个提取的记录添加原始ID
                extracted_count = len(extract_result["data"])
                success_count += 1
                total_extracted_records += extracted_count
                
                success_log = f"✓ 记录 {record_id} 提取成功: {extracted_count}条处罚信息 (耗时: {record_process_time:.2f}秒)"
                print(success_log)
                processing_logs.append(success_log)
                
                # 记录提取到的关键信息
                for i, penalty_record in enumerate(extract_result["data"]):
                    entity_name = penalty_record.get("被处罚当事人", "未知")
                    amount = penalty_record.get("罚没总金额", "0")
                    detail_log = f"  第{i+1}条: 当事人={entity_name}, 罚款金额={amount}元"
                    processing_logs.append(detail_log)
                    
                    result_row = {
                        "原始ID": record_id,
                        "状态": "成功",
                        "处理时间": f"{record_process_time:.2f}秒",
                        **penalty_record
                    }
                    results.append(result_row)
            else:
                # 如果提取失败，创建一个错误记录
                error_msg = extract_result.get("error", "未知错误")
                failure_count += 1
                
                failure_log = f"✗ 记录 {record_id} 提取失败: {error_msg} (耗时: {record_process_time:.2f}秒)"
                print(failure_log)
                processing_logs.append(failure_log)
                
                # 创建与成功提取一致的错误记录结构
                error_record = {
                    "原始ID": record_id,
                    "状态": "失败",
                    "处理时间": f"{record_process_time:.2f}秒",
                    "错误信息": error_msg,
                    "行政处罚决定书文号": "",
                    "被处罚当事人": "",
                    "主要违法违规事实": "",
                    "行政处罚依据": "",
                    "行政处罚决定": "",
                    "作出处罚决定的机关名称": "",
                    "作出处罚决定的日期": "",
                    "行业": "",
                    "罚没总金额": "",
                    "违规类型": "",
                    "监管地区": ""
                }
                results.append(error_record)
            
            # 每处理5条记录保存一次临时结果文件
            if (index + 1) % 5 == 0 or (index + 1) == len(df):
                temp_filename = f"temp_batch_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}_records_{index + 1}.csv"
                temp_filepath = os.path.join(temp_dir, temp_filename)
                
                try:
                    # 将结果转换为DataFrame并保存为CSV
                    if results:
                        temp_df = pd.DataFrame(results)
                        temp_df.to_csv(temp_filepath, index=False, encoding='utf-8-sig')
                        
                        # 创建处理统计信息文件
                        stats_filename = f"temp_stats_{datetime.now().strftime('%Y%m%d_%H%M%S')}_records_{index + 1}.txt"
                        stats_filepath = os.path.join(temp_dir, stats_filename)
                        
                        stats_content = f"""批量处罚信息提取 - 临时统计报告
时间戳: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
已处理记录数: {index + 1}
总记录数: {len(df)}
处理进度: {round(progress_percent, 2)}%
成功提取: {success_count}
提取失败: {failure_count}
成功率: {round((success_count / (index + 1)) * 100, 2) if (index + 1) > 0 else 0}%
总提取处罚记录数: {total_extracted_records}
处理时间: {round((time.time() - start_time) / 60, 2)}分钟
结果文件: {temp_filename}
"""
                        
                        with open(stats_filepath, 'w', encoding='utf-8') as f:
                            f.write(stats_content)
                        
                        temp_save_log = f"💾 临时结果已保存: {temp_filename} 和统计文件 {stats_filename} (已处理 {index + 1}/{len(df)} 条记录)"
                    else:
                        temp_save_log = f"💾 暂无结果数据，跳过临时文件保存 (已处理 {index + 1}/{len(df)} 条记录)"
                    
                    print(temp_save_log)
                    processing_logs.append(temp_save_log)
                    
                except Exception as e:
                    temp_error_log = f"⚠️ 临时文件保存失败: {str(e)}"
                    print(temp_error_log)
                    processing_logs.append(temp_error_log)
        
        # 计算总体统计信息
        total_time = time.time() - start_time
        avg_time_per_record = total_time / len(df)
        success_rate = (success_count / len(df)) * 100 if len(df) > 0 else 0
        
        completion_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        summary_log = f"[{completion_time}] 批量提取任务完成!"
        stats_log = f"处理统计: 总记录数={len(df)}, 成功={success_count}, 失败={failure_count}, 成功率={success_rate:.1f}%"
        time_stats_log = f"时间统计: 总耗时={total_time/60:.2f}分钟, 平均每条={avg_time_per_record:.2f}秒"
        output_log = f"输出结果: 提取到{total_extracted_records}条处罚信息, 总输出记录数={len(results)}"
        
        print(summary_log)
        print(stats_log)
        print(time_stats_log)
        print(output_log)
        
        processing_logs.extend([summary_log, stats_log, time_stats_log, output_log])
        
        # 清理临时文件（可选，保留最后一个临时文件作为备份）
        try:
            temp_csv_files = [f for f in os.listdir(temp_dir) if f.startswith("temp_batch_results_") and f.endswith(".csv")]
            temp_stats_files = [f for f in os.listdir(temp_dir) if f.startswith("temp_stats_") and f.endswith(".txt")]
            
            total_cleaned = 0
            
            # 清理CSV文件，保留最新的
            if len(temp_csv_files) > 1:
                temp_csv_files.sort()
                for temp_file in temp_csv_files[:-1]:
                    os.remove(os.path.join(temp_dir, temp_file))
                    total_cleaned += 1
            
            # 清理统计文件，保留最新的
            if len(temp_stats_files) > 1:
                temp_stats_files.sort()
                for temp_file in temp_stats_files[:-1]:
                    os.remove(os.path.join(temp_dir, temp_file))
                    total_cleaned += 1
            
            if total_cleaned > 0:
                latest_csv = temp_csv_files[-1] if temp_csv_files else "无"
                latest_stats = temp_stats_files[-1] if temp_stats_files else "无"
                cleanup_log = f"🧹 已清理 {total_cleaned} 个临时文件，保留最新备份: CSV={latest_csv}, 统计={latest_stats}"
                processing_logs.append(cleanup_log)
                print(cleanup_log)
        except Exception as e:
            cleanup_error_log = f"⚠️ 临时文件清理失败: {str(e)}"
            processing_logs.append(cleanup_error_log)
            print(cleanup_error_log)
        
        return {
            "message": "批量处罚信息提取完成",
            "processed_count": len(df),
            "extracted_count": len(results),
            "success_count": success_count,
            "failure_count": failure_count,
            "success_rate": round(success_rate, 2),
            "total_penalty_records": total_extracted_records,
            "processing_time_minutes": round(total_time / 60, 2),
            "average_time_per_record": round(avg_time_per_record, 2),
            "file_size_mb": round(file_size_mb, 2),
            "completion_time": completion_time,
            "temp_files_saved": True,
            "temp_directory": temp_dir,
            "results": results,
            "processing_logs": processing_logs
        }
        
    except Exception as e:
        error_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        error_log = f"[{error_time}] 批量提取任务失败: {str(e)}"
        print(error_log)
        raise HTTPException(status_code=500, detail=f"批量提取失败: {str(e)}")


@router.post("/batch-extract-penalty-info-stream")
async def batch_extract_penalty_info_stream(
    file: UploadFile = File(...),
    id_column: str = Form("id"),
    content_column: str = Form("content")
):
    """批量处罚信息提取 - 流式响应版本"""
    import time
    from datetime import datetime, timedelta
    
    # 在生成器外部读取文件，避免文件关闭问题
    try:
        # 验证文件类型
        if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
            async def error_generator():
                yield f"data: {{\"type\": \"error\", \"message\": \"只支持CSV和Excel文件\"}}\n\n"
            return StreamingResponse(
                error_generator(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Content-Type": "text/event-stream"
                }
            )
        
        # 读取文件内容
        file_read_start = time.time()
        contents = await file.read()
        file_size_mb = len(contents) / (1024 * 1024)
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        file_read_time = time.time() - file_read_start
        
        # 检查必需的列是否存在
        if id_column not in df.columns:
            async def error_generator():
                yield f"data: {{\"type\": \"error\", \"message\": \"文件中不存在列: {id_column}\"}}\n\n"
            return StreamingResponse(
                error_generator(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Content-Type": "text/event-stream"
                }
            )
        if content_column not in df.columns:
            async def error_generator():
                yield f"data: {{\"type\": \"error\", \"message\": \"文件中不存在列: {content_column}\"}}\n\n"
            return StreamingResponse(
                error_generator(),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Content-Type": "text/event-stream"
                }
            )
    except Exception as e:
        async def error_generator():
            yield f"data: {{\"type\": \"error\", \"message\": \"文件读取失败: {str(e)}\"}}\n\n"
        return StreamingResponse(
            error_generator(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream"
            }
        )
    
    async def generate_progress():
        start_time = time.time()
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        try:
            
            # 初始化统计信息
            results = []
            success_count = 0
            failure_count = 0
            total_extracted_records = 0
            
            # 发送初始信息
            start_info = {
                "type": "start",
                "message": f"[{current_time}] 开始批量处罚信息提取任务",
                "file_info": f"文件信息: {file.filename} (大小: {file_size_mb:.2f}MB, 读取耗时: {file_read_time:.2f}秒)",
                "task_info": f"任务信息: 总记录数={len(df)}, ID列='{id_column}', 内容列='{content_column}'",
                "total_records": len(df)
            }
            yield f"data: {json.dumps(start_info, ensure_ascii=False)}\n\n"
            
            # 创建临时文件目录 - 修正路径计算
            # 从 backend/app/api/v1/classification.py 到项目根目录 (向上5级)
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
            temp_dir = os.path.join(project_root, settings.DATA_FOLDER, "temp")
            os.makedirs(temp_dir, exist_ok=True)
            
            # 后台日志记录
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"批量处罚信息提取任务开始 - 文件: {file.filename}, 总记录数: {len(df)}, 临时目录: {temp_dir}")
            
            # 逐条处理记录
            for index, row in df.iterrows():
                record_start_time = time.time()
                record_id = row[id_column]
                text = str(row[content_column])
                
                # 发送简化的进度信息
                progress_info = {
                    "type": "progress",
                    "current": index + 1,
                    "total": len(df),
                    "percentage": round(((index + 1) / len(df)) * 100, 1),
                    "record_id": record_id
                }
                yield f"data: {json.dumps(progress_info, ensure_ascii=False)}\n\n"
                
                # 调用处罚信息提取函数
                logger.info(f"开始处理记录 {record_id} ({index + 1}/{len(df)}) - 文本长度: {len(text)} 字符")
                logger.debug(f"记录 {record_id} 文本预览: {text[:200]}..." if len(text) > 200 else f"记录 {record_id} 完整文本: {text}")
                extract_result = extract_penalty_info(text)
                record_process_time = time.time() - record_start_time
                
                if extract_result["success"] and extract_result["data"]:
                    extracted_count = len(extract_result["data"])
                    success_count += 1
                    total_extracted_records += extracted_count
                    
                    # 后台详细日志记录成功信息
                    logger.info(f"✓ 记录 {record_id} 提取成功: {extracted_count}条处罚信息 (耗时: {record_process_time:.2f}秒)")
                    logger.debug(f"记录 {record_id} 提取的处罚信息详情: {json.dumps(extract_result['data'], ensure_ascii=False, indent=2)}")
                    logger.info(f"当前累计统计 - 成功: {success_count + 1}, 失败: {failure_count}, 总提取记录数: {total_extracted_records + extracted_count}")
                    
                    # 发送简化的成功信息
                    success_info = {
                        "type": "success",
                        "record_id": record_id,
                        "extracted_count": extracted_count
                    }
                    yield f"data: {json.dumps(success_info, ensure_ascii=False)}\n\n"
                    
                    # 添加到结果中
                    for penalty_record in extract_result["data"]:
                        result_row = {
                            "原始ID": record_id,
                            "状态": "成功",
                            "处理时间": f"{record_process_time:.2f}秒",
                            **penalty_record
                        }
                        results.append(result_row)
                else:
                    failure_count += 1
                    error_msg = extract_result.get("error", "未知错误")
                    
                    # 后台详细日志记录失败信息
                    logger.warning(f"✗ 记录 {record_id} 提取失败: {error_msg} (耗时: {record_process_time:.2f}秒)")
                    logger.error(f"记录 {record_id} 错误详情: {extract_result}")
                    logger.info(f"当前累计统计 - 成功: {success_count}, 失败: {failure_count + 1}")
                    
                    # 发送简化的失败信息
                    failure_info = {
                        "type": "failure",
                        "record_id": record_id
                    }
                    yield f"data: {json.dumps(failure_info, ensure_ascii=False)}\n\n"
                    
                    # 添加失败记录
                    result_row = {
                        "原始ID": record_id,
                        "状态": "失败",
                        "错误信息": error_msg,
                        "处理时间": f"{record_process_time:.2f}秒"
                    }
                    results.append(result_row)
                
                # 每5条记录保存一次临时文件
                if (index + 1) % 5 == 0 or (index + 1) == len(df):
                    try:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        temp_csv_path = os.path.join(temp_dir, f"temp_batch_results_{timestamp}_records_{index + 1}.csv")
                        temp_stats_path = os.path.join(temp_dir, f"temp_stats_{timestamp}_records_{index + 1}.txt")
                        
                        # 后台详细日志记录临时文件保存
                        logger.info(f"触发临时文件保存 - 已处理 {index + 1}/{len(df)} 条记录 (每5条保存一次)")
                        
                        # 保存CSV结果
                        if results:
                            results_df = pd.DataFrame(results)
                            results_df.to_csv(temp_csv_path, index=False, encoding='utf-8-sig')
                            file_size_kb = os.path.getsize(temp_csv_path) / 1024
                            logger.info(f"临时CSV文件已保存: {temp_csv_path} ({len(results)}条记录, {file_size_kb:.2f} KB)")
                        
                        # 保存统计信息
                        current_time_elapsed = time.time() - start_time
                        current_success_rate = (success_count / (index + 1)) * 100 if (index + 1) > 0 else 0
                        logger.info(f"当前处理统计: 成功率 {current_success_rate:.1f}%, 已用时 {current_time_elapsed/60:.2f}分钟, 平均每条 {current_time_elapsed/(index + 1):.2f}秒")
                        
                        stats_content = f"""批量处罚信息提取 - 临时统计报告
生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
文件名: {file.filename}

处理进度:
- 已处理记录数: {index + 1}/{len(df)}
- 处理进度: {((index + 1) / len(df)) * 100:.1f}%
- 成功提取: {success_count} 条
- 提取失败: {failure_count} 条
- 成功率: {current_success_rate:.1f}%
- 总提取处罚信息: {total_extracted_records} 条

时间统计:
- 已用时间: {current_time_elapsed/60:.2f} 分钟
- 平均每条: {current_time_elapsed/(index + 1):.2f} 秒
"""
                        
                        with open(temp_stats_path, 'w', encoding='utf-8') as f:
                            f.write(stats_content)
                        stats_file_size_kb = os.path.getsize(temp_stats_path) / 1024
                        logger.info(f"临时统计文件已保存: {temp_stats_path} ({stats_file_size_kb:.2f} KB)")
                        
                        # 发送简化的临时保存信息
                        temp_save_info = {
                            "type": "temp_save",
                            "processed_count": index + 1,
                            "total_count": len(df)
                        }
                        yield f"data: {json.dumps(temp_save_info, ensure_ascii=False)}\n\n"
                        
                    except Exception as e:
                        error_info = {
                            "type": "temp_save_error",
                            "message": f"⚠️ 临时文件保存失败: {str(e)}"
                        }
                        yield f"data: {json.dumps(error_info, ensure_ascii=False)}\n\n"
            
            # 计算总体统计信息
            total_time = time.time() - start_time
            avg_time_per_record = total_time / len(df)
            success_rate = (success_count / len(df)) * 100 if len(df) > 0 else 0
            
            # 记录详细的任务完成日志
            logger.info(f"="*80)
            logger.info(f"批量处罚信息提取任务完成")
            logger.info(f"文件信息: {file.filename} (大小: {file_size_mb:.2f} MB)")
            logger.info(f"处理统计: 总记录 {len(df)}, 成功 {success_count}, 失败 {failure_count}")
            logger.info(f"成功率: {success_rate:.1f}%")
            logger.info(f"提取结果: 总共提取 {total_extracted_records} 条处罚信息")
            logger.info(f"时间统计: 总用时 {total_time/60:.2f}分钟, 平均每条记录 {avg_time_per_record:.2f}秒")
            logger.info(f"临时文件目录: {temp_dir}")
            logger.info(f"任务完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"="*80)
            
            # 发送简化的完成信息
            completion_info = {
                "type": "complete",
                "processed_count": len(df),
                "success_count": success_count,
                "failure_count": failure_count,
                "success_rate": round(success_rate, 2),
                "results": results
            }
            yield f"data: {json.dumps(completion_info, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            error_info = {
                "type": "error",
                "message": f"批量提取任务失败: {str(e)}"
            }
            yield f"data: {json.dumps(error_info, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate_progress(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )


@router.post("/get-file-columns")
async def get_file_columns(file: UploadFile = File(...)):
    """获取上传文件的列名"""
    try:
        # 验证文件类型
        if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
            raise HTTPException(status_code=400, detail="只支持CSV和Excel文件")
        
        # 读取文件
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # 返回列名和前几行数据作为预览
        columns = df.columns.tolist()
        preview_data = df.to_dict('records')
        
        return {
            "columns": columns,
            "preview_data": preview_data,
            "total_rows": len(df)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取文件失败: {str(e)}")


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