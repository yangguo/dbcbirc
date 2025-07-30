import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskType(str, Enum):
    CASES = "cases"
    DETAILS = "details"
    EXPORT = "export"
    OTHER = "other"

class Task:
    def __init__(self, task_type: TaskType, description: str, org_name: str = "", **kwargs):
        self.id = str(uuid.uuid4())[:8]
        self.type = task_type
        self.description = description
        self.org_name = org_name
        self.status = TaskStatus.PENDING
        self.progress = 0
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.error_message: Optional[str] = None
        self.results: Optional[Dict[str, Any]] = None
        self.kwargs = kwargs
    
    def start(self):
        """Mark task as started"""
        self.status = TaskStatus.RUNNING
        self.started_at = datetime.now()
        logger.info(f"Task {self.id} started: {self.description}")
    
    def update_progress(self, progress: int):
        """Update task progress"""
        self.progress = min(100, max(0, progress))
        logger.debug(f"Task {self.id} progress: {self.progress}%")
    
    def complete(self, results: Optional[Dict[str, Any]] = None):
        """Mark task as completed"""
        self.status = TaskStatus.COMPLETED
        self.progress = 100
        self.completed_at = datetime.now()
        self.results = results
        logger.info(f"Task {self.id} completed: {self.description}")
    
    def fail(self, error_message: str):
        """Mark task as failed"""
        self.status = TaskStatus.FAILED
        self.completed_at = datetime.now()
        self.error_message = error_message
        logger.error(f"Task {self.id} failed: {error_message}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary"""
        return {
            "id": self.id,
            "type": self.type,
            "description": self.description,
            "org_name": self.org_name,
            "status": self.status,
            "progress": self.progress,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
            "started_at": self.started_at.strftime("%Y-%m-%d %H:%M") if self.started_at else None,
            "completed_at": self.completed_at.strftime("%Y-%m-%d %H:%M") if self.completed_at else None,
            "error_message": self.error_message,
            "results": self.results,
            **self.kwargs
        }

class TaskService:
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.max_history_size = 100  # Keep only the last 100 tasks
    
    def create_task(self, task_type: TaskType, description: str, org_name: str = "", **kwargs) -> Task:
        """Create a new task"""
        task = Task(task_type, description, org_name, **kwargs)
        
        # Clean up old tasks if we exceed the limit
        if len(self.tasks) >= self.max_history_size:
            # Remove oldest completed/failed tasks
            old_tasks = sorted(
                [t for t in self.tasks.values() if t.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]],
                key=lambda x: x.created_at
            )
            if old_tasks:
                del self.tasks[old_tasks[0].id]
        
        self.tasks[task.id] = task
        logger.info(f"Created task {task.id}: {description}")
        return task
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get task by ID"""
        return self.tasks.get(task_id)
    
    def get_all_tasks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all tasks sorted by creation time (newest first)"""
        tasks = sorted(self.tasks.values(), key=lambda x: x.created_at, reverse=True)
        return [task.to_dict() for task in tasks[:limit]]
    
    def get_active_tasks(self) -> List[Dict[str, Any]]:
        """Get only active (pending/running) tasks"""
        active_tasks = [task for task in self.tasks.values() 
                       if task.status in [TaskStatus.PENDING, TaskStatus.RUNNING]]
        active_tasks.sort(key=lambda x: x.created_at, reverse=True)
        return [task.to_dict() for task in active_tasks]
    
    def start_task(self, task_id: str):
        """Start a task"""
        task = self.get_task(task_id)
        if task:
            task.start()
    
    def update_task_progress(self, task_id: str, progress: int):
        """Update task progress"""
        task = self.get_task(task_id)
        if task:
            task.update_progress(progress)
    
    def complete_task(self, task_id: str, results: Optional[Dict[str, Any]] = None):
        """Complete a task"""
        task = self.get_task(task_id)
        if task:
            task.complete(results)
    
    def fail_task(self, task_id: str, error_message: str):
        """Fail a task"""
        task = self.get_task(task_id)
        if task:
            task.fail(error_message)
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Remove tasks older than max_age_hours"""
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        tasks_to_remove = [
            task_id for task_id, task in self.tasks.items()
            if task.created_at.timestamp() < cutoff_time and 
               task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]
        ]
        
        for task_id in tasks_to_remove:
            del self.tasks[task_id]
            logger.debug(f"Cleaned up old task: {task_id}")

# Global task service instance
task_service = TaskService()

# Convenience functions for creating specific task types
def create_update_cases_task(org_name: str, start_page: int, end_page: int) -> Task:
    """Create a task for updating cases"""
    description = f"更新{org_name}案例列表 (第{start_page}-{end_page}页)"
    return task_service.create_task(
        TaskType.CASES, 
        description, 
        org_name,
        start_page=start_page,
        end_page=end_page
    )

def create_update_details_task(org_name: str) -> Task:
    """Create a task for updating case details"""
    description = f"更新{org_name}案例详情"
    return task_service.create_task(
        TaskType.DETAILS, 
        description, 
        org_name
    )

def create_export_task(format_type: str = "csv") -> Task:
    """Create a task for exporting data"""
    description = f"导出数据为{format_type.upper()}格式"
    return task_service.create_task(
        TaskType.EXPORT, 
        description,
        format_type=format_type
    )
