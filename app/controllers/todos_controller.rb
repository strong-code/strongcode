class TodosController < ApplicationController

  def index
    @todos = Todo.all
  end

  def new
    @todo = Todo.new
  end

  def create
    todo_params[:tags] = todo_params[:tags].split(',')
    @todo = Todo.new(todo_params)

    if @todo.save
      redirect_to root_url
    end
  end

  def show
    @todo = Todo.find(params[:id])
  end

  private

  def todo_params
    params.require(:todo).permit(:title, :tags)
  end
end
