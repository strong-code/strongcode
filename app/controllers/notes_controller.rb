class NotesController < ApplicationController

  def new
    @note = Note.new
  end

  def create
    @note = Note.new(note_params)
    @note.tags = note_params[:tags].split(', ')

    if @note.save
      flash[:success] = "Note saved"
      redirect_to root_url
    else
      flash[:error] = "Erro saving new note"
      render @note
    end
  end

  private

  def note_params
    params.require(:note).permit(:title, :body, :tags)
  end

end
