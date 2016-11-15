class DropDateColumnFromWeight < ActiveRecord::Migration
  def change
    remove_column :weights, :date
  end
end
