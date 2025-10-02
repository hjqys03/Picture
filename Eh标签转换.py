import sys
import os
import re
import json
from datetime import datetime

# 映射字典（键不区分大小写）
category_map = {
    "manga": "漫画",
    "doujinshi": "同人志",
    "artist cg": "画师CG",
    "game cg": "游戏CG",
    "western": "西方",
    "non-h": "无H",
    "image set": "图集",
    "asian porn": "亚洲色情",
    "misc": "杂项",
    "private": "私有"
}

language_map = {
    "japanese": "日语",
    "chinese": "汉语",
    "english": "英语",
    "korean": "韩语"
}

def is_url(text):
    """检查文本是否是URL"""
    url_patterns = [
        r'https?://',  # http:// 或 https://
        r'www\.',      # www.
        r'\.(com|org|net|io|me|info|biz|xyz|jp|cn|kr|us|uk|de|fr|ru|ca|au|nz|eu|tv|cc|to|gd|ga|gq|ml|tk|cf|nl|se|no|fi|dk|it|es|pt|br|mx|ar|cl|pe|co|ve|ec|uy|py|bo|cr|pa|do|gt|sv|hn|ni|pr|cu|jm|ht|tt|bz|gy|sr|gf|gp|mq|aw|an|ai|ag|vg|ky|bm|bs|tc|ms|dm|lc|vc|kn|gd|bb|mf|sx|cw|bq|bl|pm|wf|pf|nc|vu|fj|pg|sb|to|ws|ki|mh|fm|nr|pw|tv|nu|ck|tk|gs|bv|hm|tf|io|cx|cc|sh|ac|ta|um|ap)$',  # 常见域名后缀
    ]
    
    for pattern in url_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def parse_json_format1(data, file_path):
    """解析第一种JSON格式"""
    # 提取文件名
    file_name = data.get("title_jp") or data.get("title") or os.path.splitext(os.path.basename(file_path))[0]
    
    # 提取信息
    category = None
    language = data.get("language")
    date_str = data.get("date")
    posted = None
    
    # 处理日期
    if date_str:
        try:
            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
            if date_match:
                date_obj = datetime.strptime(date_match.group(1), "%Y-%m-%d")
                posted = date_obj.strftime("%Y/%m/%d")
        except:
            pass
    
    # 处理标签
    tags_dict = {
        "language": [], "parody": [], "group": [], "character": [], "artist": [], "male": [], "female": [], "mixed": [], "other": [], "location": []
    }
    
    tags = data.get("tags", [])
    for tag in tags:
        if ':' in tag:
            tag_type, tag_value = tag.split(':', 1)
            tag_type = tag_type.strip().lower()
            tag_value = tag_value.strip()
            
            if tag_type in tags_dict:
                tags_dict[tag_type].append(f"{tag_type}:{tag_value}")
    
    return file_name, category, language, posted, tags_dict

def parse_json_format2(data, file_path):
    """解析第二种JSON格式"""
    gallery_info = data.get("gallery_info", {})
    
    # 提取文件名
    file_name = gallery_info.get("title_original") or gallery_info.get("title") or os.path.splitext(os.path.basename(file_path))[0]
    
    # 提取信息
    category = gallery_info.get("category")
    language = gallery_info.get("language")
    upload_date = gallery_info.get("upload_date")
    posted = None
    
    # 处理日期
    if upload_date and len(upload_date) >= 3:
        try:
            year = upload_date[0]
            month = upload_date[1]
            day = upload_date[2]
            posted = f"{year}/{month:02d}/{day:02d}"
        except:
            pass
    
    # 处理标签
    tags_dict = {
        "language": [], "parody": [], "group": [], "character": [], "artist": [], "male": [], "female": [], "mixed": [], "other": [], "location": []
    }
    
    tags = gallery_info.get("tags", {})
    for tag_type, tag_values in tags.items():
        tag_type = tag_type.strip().lower()
        if tag_type in tags_dict:
            for tag_value in tag_values:
                tags_dict[tag_type].append(f"{tag_type}:{tag_value.strip()}")
    
    return file_name, category, language, posted, tags_dict

def parse_text_content(content, file_path):
    """解析文本格式内容"""
    lines = content.split('\n')
    if len(lines) >= 2 and lines[1].strip():
        second_line = lines[1].strip()
        
        # 检查第二行是否是URL
        if is_url(second_line):
            # 如果是URL，使用源文件名
            base_name = os.path.basename(file_path)
            file_name = os.path.splitext(base_name)[0]
        else:
            file_name = second_line
    else:
        # 使用源文件名（不带扩展名）
        base_name = os.path.basename(file_path)
        file_name = os.path.splitext(base_name)[0]
    
    # 初始化变量
    category = None
    language = None
    posted = None
    in_tags_section = False
    tags_dict = {
        "language": [], "parody": [], "group": [], "character": [], "artist": [], "male": [], "female": [], "mixed": [], "other": [], "location": []
    }
    
    # 逐行解析内容
    for line in lines:
        line = line.strip()
        
        # 跳过空行
        if not line:
            in_tags_section = False
            continue
        
        # 检查是否是Category行
        if line.lower().startswith("category:"):
            category = line.split(":", 1)[1].strip()
            in_tags_section = False
            continue
        
        # 检查是否是Language行
        if line.lower().startswith("language:"):
            language = line.split(":", 1)[1].strip()
            in_tags_section = False
            continue
        
        # 检查是否是Posted行
        if line.lower().startswith("posted:"):
            # 提取日期部分并转换为标准格式
            date_str = line.split(":", 1)[1].strip()
            # 尝试解析日期 (格式: YYYY-MM-DD)
            try:
                # 提取日期部分（可能包含时间）
                date_match = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
                if date_match:
                    date_obj = datetime.strptime(date_match.group(1), "%Y-%m-%d")
                    # 格式化为 YYYY/MM/DD
                    posted = date_obj.strftime("%Y/%m/%d")
            except:
                pass  # 如果日期格式无效则忽略
            in_tags_section = False
            continue
        
        # 检查是否是Tags行
        if line.lower().startswith("tags:"):
            in_tags_section = True
            continue
        
        # 处理标签内容
        if in_tags_section and line.startswith(">"):
            # 移除开头的">"
            tag_line = line[1:].strip()
            
            # 检查标签行是否包含":"
            if ":" not in tag_line:
                continue
                
            # 分割标签类型和标签值
            tag_type, tag_values = tag_line.split(":", 1)
            tag_type = tag_type.strip().lower()
            
            # 处理多个标签值
            tags = [t.strip() for t in tag_values.split(",") if t.strip()]
            
            if tag_type in tags_dict:
                for tag in tags:
                    tags_dict[tag_type].append(f"{tag_type}:{tag}")
    
    return file_name, category, language, posted, tags_dict

def parse_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 尝试解析为JSON格式
    try:
        data = json.loads(content)
        
        # 判断JSON格式类型
        if "gallery_info" in data:
            return parse_json_format2(data, file_path)
        else:
            return parse_json_format1(data, file_path)
    
    except json.JSONDecodeError:
        # 不是JSON格式，按文本格式处理
        return parse_text_content(content, file_path)

def main():
    if len(sys.argv) < 2:
        print("请将文件拖放到脚本上")
        return
    
    for file_path in sys.argv[1:]:
        if not os.path.isfile(file_path):
            continue
            
        try:
            file_name, category, language, posted, tags_dict = parse_file(file_path)
            
            # 构建输出内容
            output_lines = []
            
            # 添加类别（不区分大小写）- 只有当存在时才添加
            if category:
                cat_key = category.lower() if category else ""
                cat_value = category_map.get(cat_key, cat_key)
                output_lines.append(f"类别:{cat_value}")
            
            # 添加语言（不区分大小写）- 只有当存在时才添加
            if language:
                lang_key = language.lower() if language else ""
                lang_value = language_map.get(lang_key, lang_key)
                output_lines.append(f"语言:{lang_value}")
            
            # 添加所有标签 - 只有当存在时才添加
            for tag_type in tags_dict:
                if tags_dict[tag_type]:
                    output_lines.extend(tags_dict[tag_type])
            
            # 构建第一行内容
            part1 = ""
            if output_lines:
                part1 = ', '.join(output_lines) + ','
            
            # 构建第二行内容（发布时间）- 只有当存在时才添加
            part2 = ""
            if posted:
                part2 = f""
            
            # 组合两部分内容
            content = ""
            if part1 and part2:
                content = f"{part1}\n{part2}"
            elif part1:
                content = part1
            elif part2:
                content = part2
            
            if not content:
                print(f"文件 {file_path} 没有可提取的内容，跳过")
                continue
                
            # 创建输出文件
            output_file = f"{file_name}.txt"
            # 确保文件名有效（替换无效字符）
            output_file = re.sub(r'[\\/*?:"<>|]', '_', output_file)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # 成功创建输出文件后删除原始文件
            os.remove(file_path)
            print(f"已创建: {output_file}，并删除原始文件: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"处理文件 {file_path} 时出错: {str(e)}")

if __name__ == "__main__":
    main()