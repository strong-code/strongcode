class JournalEntriesController < ApplicationController

  def index
    #@jes = @user.journal_entries
    @jes = JournalEntry.for(params[:date], @user)
    
    respond_to do |f|
      f.html
      f.json { render json: @jes }
    end
  end

  def new
    @je = JournalEntry.new
  end

  def create
    @je = @user.journal_entries.new(journal_entry_params)
    if @je.save
      respond_to do |f|
        f.html { redirect_to journal_entries_path }
        f.json { render json: { success: "true", text: @je.text } }
      end
    end
  end

  private

  def journal_entry_params
    params.require(:journal_entry).permit(:text)
  end

end
