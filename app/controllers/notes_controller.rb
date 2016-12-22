class NotesController < ApplicationController

  def index
    @notes = Note.all.order('updated_at DESC')
  end

  def show
    @note = Note.find(params[:id])
  end

  def edit
    @note = Note.find(params[:id])
  end

  def new
    @note = Note.new
  end

  def create
    @note = Note.new(note_params)
    @note.body = "A new note..."
    @note.tags = note_params[:tags].split(', ')

    if @note.save
      flash[:success] = "Note saved"
      redirect_to note_path(@note)
    else
      flash[:error] = "Error saving new note"
      render @note
    end
  end

  def update
    @note = Note.find(params[:id])
    @note.update_attributes(note_params)
    redirect_to note_path(@note)
  end

  def destroy
    @note = Note.find(params[:id]).destroy
    redirect_to notes_path
  end

  private

  def note_params
    params.require(:note).permit(:title, :body, :tags)
  end

end
