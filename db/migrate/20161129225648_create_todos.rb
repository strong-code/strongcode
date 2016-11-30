class CreateTodos < ActiveRecord::Migration
  def change
    create_table :todos do |t|
      t.string :title
      t.string :tags, default: [], array: true
      t.timestamps null: false
    end
  end
end
