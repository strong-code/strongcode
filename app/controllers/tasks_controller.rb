class TasksController < ApplicationController

  def new
    @todo = Todo.find(params[:todo_id])
    @task = Task.new
  end

  def create
    todo = Todo.find(params[:todo_id])
    @task = todo.tasks.create(task_params)
    
    if @task.save
      redirect_to root_url
    end
  end

  def update
    @task = Task.find(params[:task_id])
    @task.update_attributes(task_params)
    redirect_to root_url
  end

  private

  def task_params
    params.require(:task).permit(:name, :item, :completed)  
  end

end
